/**
 * API Utilities for Server Communication
 * 
 * Provides robust HTTP client for Supabase Edge Functions with:
 * - Automatic JWT token management and refresh
 * - Retry logic with exponential backoff
 * - Server outage detection and user notifications
 * - File upload handling (DXF, images)
 * - Response caching for GET requests
 * 
 * Architecture:
 * - Frontend (React) → API Client (this file) → Edge Function (Hono server)
 * - All requests go through /make-server-8927474f route prefix
 * - Auth: Bearer token (JWT from Supabase Auth)
 * - Errors: Automatic retry → fallback → user notification
 * 
 * @module api
 */

import { projectId, publicAnonKey } from './supabase/info';
import { getSupabaseClient } from './supabase/client';
import { cache, cachedApiCall } from './cache';
import { Analytics } from './analytics';
import { logError } from './errorLogger';

/**
 * Base URL for all API requests
 * Points to Supabase Edge Function with custom route prefix
 */
const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-8927474f`;

// ============================================================================
// RETRY CONFIGURATION
// ============================================================================

/**
 * Maximum retry attempts for failed requests
 * 
 * Rationale:
 * - 1st attempt: Original request
 * - 2nd attempt: Retry after 1s (transient network error)
 * - 3rd attempt: Retry after 2s (server recovering)
 * - 4th attempt: Retry after 3s (last chance)
 * - After 3 retries (4 total attempts): Show outage notification
 * 
 * Total time before giving up: 1s + 2s + 3s = 6 seconds
 * This balances quick failure detection vs giving server time to recover
 */
const MAX_RETRIES = 3;

/**
 * Initial retry delay (1 second)
 * 
 * Delay increases with each retry attempt:
 * - 1st retry: 1000ms (1 second)
 * - 2nd retry: 1000ms (kept constant for simplicity)
 * - 3rd retry: 1000ms
 * 
 * Note: Using constant delay instead of exponential backoff
 * because edge functions typically recover quickly (<1s) or are fully down.
 * Exponential backoff would add unnecessary waiting time.
 */
const RETRY_DELAY = 1000; // 1 second

/**
 * Token expiry buffer (5 minutes)
 * 
 * Refresh tokens proactively if they expire within this window.
 * 
 * Rationale:
 * - JWT tokens from Supabase typically last 1 hour
 * - Refreshing 5 minutes early prevents mid-checkout expiry
 * - User won't notice a 5-minute reduction in token lifetime
 * - Prevents "Unauthorized" errors during long sessions
 */
const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Session fetch timeout (3 seconds)
 * 
 * Prevents getSession() from hanging indefinitely.
 * 
 * Rationale:
 * - Supabase getSession() occasionally hangs on slow networks
 * - 3 seconds is long enough for legitimate requests
 * - Short enough to prevent blocking the UI
 * - Fallback: Use public anon key if timeout occurs
 */
const SESSION_TIMEOUT = 3000; // 3 seconds

// ============================================================================
// SERVER OUTAGE NOTIFICATION SYSTEM
// ============================================================================

/**
 * Global outage trigger callback
 * Set from React component via setOutageTrigger()
 * Called when all retries fail with "Failed to fetch" error
 */
let globalOutageTrigger: (() => void) | null = null;

/**
 * Register outage notification callback
 * 
 * Should be called once from App.tsx or root component.
 * Enables automatic user notification when server is unreachable.
 * 
 * @param trigger - Callback to show outage notification modal
 * 
 * @example
 * // In App.tsx
 * useEffect(() => {
 *   setOutageTrigger(() => setShowOutageModal(true));
 * }, []);
 */
export function setOutageTrigger(trigger: () => void) {
  globalOutageTrigger = trigger;
}

// ============================================================================
// FETCH WITH RETRY LOGIC
// ============================================================================

/**
 * Fetch with automatic retry on network errors
 * 
 * Retry Strategy:
 * 1. Attempt request
 * 2. If network error (not HTTP error): Wait RETRY_DELAY and retry
 * 3. Repeat up to MAX_RETRIES times
 * 4. If all retries fail: Trigger outage notification
 * 
 * Important: Only retries network errors (fetch failures).
 * HTTP errors (401, 404, 500, etc.) are NOT retried.
 * 
 * @param url - Full URL to fetch
 * @param options - Fetch options (headers, method, body)
 * @param retries - Remaining retry attempts (internal use)
 * @returns Response object
 * @throws Error if all retries exhausted
 * 
 * @example
 * const response = await fetchWithRetry('https://api.example.com/data', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ data: 'value' })
 * });
 */
async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  try {
    const response = await fetch(url, options);
    return response; // Success - return response (even if HTTP error status)
  } catch (error: any) {
    // Network error occurred (server unreachable, CORS, DNS failure, etc.)
    
    if (retries > 0) {
      // We have retries remaining
      const attemptNumber = MAX_RETRIES - retries + 1;
      console.log(`Fetch failed, retrying... (${attemptNumber}/${MAX_RETRIES})`, error.message);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      
      // Recursive retry
      return fetchWithRetry(url, options, retries - 1);
    }
    
    // All retries exhausted - check if it's a server outage
    if (globalOutageTrigger && error.message === 'Failed to fetch') {
      console.log('🔴 Triggering server outage notification - all retries failed');
      globalOutageTrigger(); // Show modal to user
    }
    
    // Re-throw error for caller to handle
    throw error;
  }
}

// ============================================================================
// JWT TOKEN MANAGEMENT
// ============================================================================

/**
 * Get valid JWT access token with automatic refresh
 * 
 * Token Strategy:
 * 1. Check localStorage for cached access_token
 * 2. If token exists, check expiry:
 *    - If expires in <5 minutes: Proactively refresh
 *    - Otherwise: Use cached token
 * 3. If no cached token: Fetch from Supabase Auth
 * 4. If no session: Return public anon key (guest mode)
 * 
 * Token Format (JWT):
 * - Header: Algorithm and type
 * - Payload: User ID, expiry (exp), issued at (iat)
 * - Signature: Cryptographic signature
 * 
 * Expiry Handling:
 * - Tokens expire after 1 hour by default
 * - We refresh proactively at 55 minutes (5-minute buffer)
 * - Prevents mid-transaction expiry during checkout
 * 
 * @returns JWT access token or public anon key
 * 
 * @example
 * const token = await getValidToken();
 * // Returns: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
 */
async function getValidToken(): Promise<string> {
  try {
    // ========================================================================
    // STEP 1: Check localStorage for cached token
    // ========================================================================
    const storedToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (storedToken && storedToken !== publicAnonKey) {
      // We have a token - check if it's expiring soon
      
      try {
        // Parse JWT to check expiry
        // JWT structure: header.payload.signature
        // Payload is base64-encoded JSON
        const tokenPayload = JSON.parse(atob(storedToken.split('.')[1]));
        const expiresAt = tokenPayload.exp * 1000; // Convert Unix timestamp to milliseconds
        const now = Date.now();
        
        // ====================================================================
        // STEP 2: Proactive token refresh if expiring soon
        // ====================================================================
        if (expiresAt - now < TOKEN_EXPIRY_BUFFER && refreshToken) {
          console.log('Token expiring soon, refreshing...');
          
          const supabase = getSupabaseClient();
          const { data, error } = await supabase.auth.refreshSession({
            refresh_token: refreshToken,
          });
          
          if (!error && data.session) {
            // Update localStorage with fresh tokens
            localStorage.setItem('access_token', data.session.access_token);
            localStorage.setItem('refresh_token', data.session.refresh_token);
            console.log('Token refreshed proactively');
            return data.session.access_token;
          }
          // If refresh fails, fall through to use stored token
        }
      } catch (parseError) {
        // Token parsing failed (malformed JWT?)
        // Not critical - just use the token as-is
        console.warn('Could not parse token for expiry check:', parseError);
      }
      
      // Token is valid and not expiring soon - use it
      return storedToken;
    }
    
    // ========================================================================
    // STEP 3: No cached token - fetch from Supabase Auth
    // ========================================================================
    const supabase = getSupabaseClient();
    
    // Add timeout to prevent hanging (getSession can hang on slow networks)
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('getSession timeout')), SESSION_TIMEOUT)
    );
    
    // Race: Either get session or timeout
    const { data: { session }, error } = await Promise.race([
      sessionPromise,
      timeoutPromise
    ]) as any;
    
    if (error) {
      console.warn('Session error:', error);
      return publicAnonKey; // Fallback to guest mode
    }
    
    if (!session) {
      // No active session - user is not logged in
      return publicAnonKey; // Guest mode
    }
    
    // ========================================================================
    // STEP 4: Cache token in localStorage for future requests
    // ========================================================================
    localStorage.setItem('access_token', session.access_token);
    if (session.refresh_token) {
      localStorage.setItem('refresh_token', session.refresh_token);
    }
    
    return session.access_token;
    
  } catch (error) {
    console.error('Error getting token:', error);
    return publicAnonKey; // Fallback to guest mode on any error
  }
}

// ============================================================================
// MAIN API CALL FUNCTION
// ============================================================================

/**
 * Make authenticated API call to Supabase Edge Function
 * 
 * Features:
 * - Automatic JWT token handling (refresh if needed)
 * - Retry on network failures (3 retries with 1s delay)
 * - JSON validation (rejects non-JSON responses)
 * - Error logging and analytics
 * - 401 Unauthorized handling
 * 
 * Authentication Modes:
 * - useAuth=true (default): Use JWT token (logged-in user or guest anon key)
 * - useAuth=false: Always use public anon key (for public endpoints)
 * 
 * Error Handling:
 * - Network errors: Retry up to 3 times, then throw
 * - 401 Unauthorized: Throw error (caller should redirect to login)
 * - Other HTTP errors: Throw with error message from response
 * - Non-JSON responses: Throw error (server misconfiguration)
 * 
 * @param endpoint - API endpoint (e.g., "/orders", "/materials")
 * @param options - Fetch options (method, body, headers)
 * @param useAuth - Whether to use JWT authentication (default: true)
 * @returns Parsed JSON response
 * @throws Error on network failure, HTTP error, or invalid response
 * 
 * @example
 * // Authenticated request
 * const orders = await apiCall('/orders', { method: 'GET' });
 * 
 * @example
 * // Create new order
 * const newOrder = await apiCall('/orders', {
 *   method: 'POST',
 *   body: JSON.stringify({ items: [...], total: 1500 })
 * });
 * 
 * @example
 * // Public request (no auth)
 * const materials = await apiCall('/materials', { method: 'GET' }, false);
 */
export async function apiCall(
  endpoint: string, 
  options: RequestInit = {},
  useAuth: boolean = true
) {
  // Prepare headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Get authentication token
  let token: string;
  if (useAuth) {
    token = await getValidToken(); // May refresh token if expiring
  } else {
    token = publicAnonKey; // Guest mode
  }
  headers['Authorization'] = `Bearer ${token}`;

  console.log(`API Call: ${endpoint}`, { useAuth, hasToken: !!token });

  try {
    // Make request with retry logic
    const response = await fetchWithRetry(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    console.log(`API Response: ${endpoint}`, { status: response.status, ok: response.ok });

    // ========================================================================
    // Validate response is JSON
    // ========================================================================
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error(`Non-JSON response from ${endpoint}:`, text);
      throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
    }

    const data = await response.json();
    
    // ========================================================================
    // Handle HTTP errors
    // ========================================================================
    if (!response.ok) {
      // Special handling for 401 Unauthorized
      if (response.status === 401) {
        // Only log if it's not a simple auth failure (wrong password)
        const isAuthFailure = data.error?.toLowerCase().includes('invalid') || 
                             data.error?.toLowerCase().includes('password') ||
                             data.error?.toLowerCase().includes('credentials');
        
        if (!isAuthFailure) {
          console.log(`⚠️ Authentication required for ${endpoint}`);
        }
        
        // Check if server provided a specific error message (e.g., login failures)
        if (data.error) {
          throw new Error(data.error);
        }
        
        // Check if it's specifically a JWT issue (token expired/invalid)
        if (data.message?.includes('Invalid JWT') || data.message?.includes('JWT')) {
          throw new Error('Unauthorized: Invalid JWT');
        }
        
        // Generic unauthorized error (for protected endpoints without specific message)
        throw new Error('Unauthorized');
      } else {
        // Log other errors
        console.error(`❌ API Error on ${endpoint}:`, data);
      }
      
      throw new Error(data.error || 'API request failed');
    }

    return data;
    
  } catch (error) {
    // Only log unexpected errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isUserError = errorMessage.toLowerCase().includes('invalid') || 
                       errorMessage.toLowerCase().includes('password') ||
                       errorMessage.toLowerCase().includes('credentials');
    
    if (!isUserError) {
      console.error(`Error making API call to ${endpoint}:`, error);
    }
    
    throw error;
  }
}

// ============================================================================
// CACHED API CALLS
// ============================================================================

/**
 * Make cached API call for GET requests
 * 
 * Caching Strategy:
 * - First call: Fetch from server, store in memory cache
 * - Subsequent calls: Return cached data (no server request)
 * - After TTL expires: Fetch fresh data, update cache
 * 
 * Use Cases:
 * - Materials list (changes rarely, accessed often)
 * - Shipping rates (static data, updated by admin)
 * - Order history (can show stale data briefly)
 * 
 * Don't Use For:
 * - Cart data (real-time updates needed)
 * - Checkout data (must be fresh)
 * - Admin panel data (must show latest)
 * 
 * @param endpoint - API endpoint
 * @param cacheKey - Unique cache identifier
 * @param ttl - Time to live in milliseconds (default: 5 minutes)
 * @param options - Fetch options
 * @returns Cached or fresh data
 * 
 * @example
 * // Cache materials for 30 minutes
 * const materials = await cachedApiCallWrapper(
 *   '/materials',
 *   'materials',
 *   30 * 60 * 1000
 * );
 */
export async function cachedApiCallWrapper<T>(
  endpoint: string,
  cacheKey: string,
  ttl: number = 5 * 60 * 1000, // Default 5 minutes
  options: RequestInit = {}
): Promise<T> {
  return cachedApiCall(
    cacheKey,
    () => apiCall(endpoint, options),
    ttl
  );
}

// ============================================================================
// MATERIALS API (CACHED)
// ============================================================================

/**
 * Fetch materials with 30-minute cache
 * 
 * Materials change rarely (only when admin updates pricing/availability).
 * 30-minute cache reduces server load and improves UX.
 * 
 * Cache is automatically invalidated when admin updates materials
 * via invalidateMaterialsCache().
 * 
 * @returns Array of material objects with pricing
 * 
 * @example
 * const materials = await fetchMaterials();
 * // Returns: [{ id: 1, name: "Mild Steel", category: "Metal", ... }, ...]
 */
export async function fetchMaterials() {
  return cachedApiCallWrapper(
    '/materials',
    'materials',
    30 * 60 * 1000, // 30 minutes
    { method: 'GET' }
  );
}

/**
 * Invalidate materials cache
 * 
 * Call this after admin updates materials in admin panel.
 * Forces next fetchMaterials() call to fetch fresh data.
 * 
 * @example
 * // After updating material pricing in admin panel
 * await apiCall('/admin/materials', { method: 'PUT', body: ... });
 * invalidateMaterialsCache(); // Clear cache
 */
export function invalidateMaterialsCache() {
  cache.invalidate('materials');
}

// ============================================================================
// FILE UPLOAD FUNCTIONS
// ============================================================================

/**
 * Upload DXF file to server for processing
 * 
 * This endpoint is DEPRECATED - kept for backward compatibility.
 * New code should use uploadDesignFile() which uploads directly to Supabase Storage.
 * 
 * @param file - DXF file to upload
 * @returns Upload response with file metadata
 * @throws Error on upload failure or auth error
 * 
 * @deprecated Use uploadDesignFile() instead
 */
export async function uploadDXF(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const token = await getValidToken();
  const headers: HeadersInit = {
    'Authorization': `Bearer ${token}`,
    // Note: Don't set Content-Type for FormData - browser sets it automatically with boundary
  };

  const response = await fetch(`${API_BASE}/upload-dxf`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error('Upload DXF Error:', data);
    
    // Handle token expiration specifically
    if (response.status === 401 && (data.code === 401 || data.message?.includes('Invalid JWT'))) {
      throw new Error('Unauthorized: Invalid JWT');
    }
    
    throw new Error(data.error || 'Upload failed');
  }

  return data;
}

/**
 * Upload design file (DXF/SVG) directly to Supabase Storage
 * 
 * Replaces server-side /tmp storage with cloud storage.
 * Files are stored in 'design-files' bucket with unique names.
 * 
 * File Naming:
 * - Format: {timestamp}_{random}.{extension}
 * - Example: 1702389847123_k3x9m2p.dxf
 * - Prevents collisions and allows sorting by upload time
 * 
 * Storage Configuration:
 * - Bucket: design-files (private)
 * - Path: uploads/{filename}
 * - URL: Signed URL with 1-year expiry
 * - Cache-Control: 3600 seconds (1 hour)
 * 
 * Analytics:
 * - Tracks file type and size for usage statistics
 * - Logs upload failures for debugging
 * 
 * @param file - DXF or SVG file to upload
 * @returns Upload metadata (original filename, signed URL, storage path)
 * @throws Error on upload failure
 * 
 * @example
 * const { fileName, url, path } = await uploadDesignFile(dxfFile);
 * // Returns: {
 * //   fileName: "my-design.dxf",
 * //   url: "https://....supabase.co/storage/v1/object/sign/design-files/uploads/...",
 * //   path: "uploads/1702389847123_k3x9m2p.dxf"
 * // }
 */
export async function uploadDesignFile(file: File): Promise<{ fileName: string; url: string; path: string }> {
  try {
    const supabase = getSupabaseClient();
    
    // ========================================================================
    // Generate unique filename
    // ========================================================================
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7); // 7-char random string
    const extension = file.name.split('.').pop();
    const fileName = `${timestamp}_${randomStr}.${extension}`;
    const filePath = `uploads/${fileName}`;
    
    // Track upload analytics
    Analytics.fileUploaded(extension || 'unknown', file.size);
    
    // ========================================================================
    // Upload to Supabase Storage
    // ========================================================================
    const { data, error } = await supabase.storage
      .from('design-files')
      .upload(filePath, file, {
        cacheControl: '3600', // Cache for 1 hour
        upsert: false // Don't overwrite existing files
      });
    
    if (error) {
      logError(error, 'uploadDesignFile');
      throw new Error(`Upload failed: ${error.message}`);
    }
    
    // ========================================================================
    // Get signed URL (required for private buckets)
    // ========================================================================
    const { data: urlData } = await supabase.storage
      .from('design-files')
      .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year expiry
    
    if (!urlData || !urlData.signedUrl) {
      throw new Error('Failed to get file URL');
    }
    
    return {
      fileName: file.name, // Original filename for display
      url: urlData.signedUrl, // Signed URL for download
      path: filePath // Storage path for database reference
    };
    
  } catch (error: any) {
    logError(error, 'uploadDesignFile');
    Analytics.fileValidationError(error.message);
    throw error;
  }
}

/**
 * Upload sketch/image file directly to Supabase Storage
 * 
 * Used for sketch-to-DXF service where users upload photos/scans.
 * Files are stored in separate 'sketch-files' bucket.
 * 
 * Supported Formats:
 * - Images: JPG, PNG, HEIC, WebP
 * - Documents: PDF (for scanned drawings)
 * 
 * Storage Configuration:
 * - Bucket: sketch-files (private)
 * - Path: sketches/{filename}
 * - URL: Signed URL with 1-year expiry
 * 
 * @param file - Image or PDF file
 * @returns Upload metadata (original filename, signed URL, storage path)
 * @throws Error on upload failure
 * 
 * @example
 * const { fileName, url, path } = await uploadSketchFile(imageFile);
 */
export async function uploadSketchFile(file: File): Promise<{ fileName: string; url: string; path: string }> {
  try {
    const supabase = getSupabaseClient();
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const extension = file.name.split('.').pop();
    const fileName = `${timestamp}_${randomStr}.${extension}`;
    const filePath = `sketches/${fileName}`;
    
    // Track upload analytics
    Analytics.fileUploaded(extension || 'unknown', file.size);
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('sketch-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      logError(error, 'uploadSketchFile');
      throw new Error(`Upload failed: ${error.message}`);
    }
    
    // Get signed URL
    const { data: urlData } = await supabase.storage
      .from('sketch-files')
      .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year expiry
    
    if (!urlData || !urlData.signedUrl) {
      throw new Error('Failed to get file URL');
    }
    
    return {
      fileName: file.name,
      url: urlData.signedUrl,
      path: filePath
    };
    
  } catch (error: any) {
    logError(error, 'uploadSketchFile');
    Analytics.fileValidationError(error.message);
    throw error;
  }
}

/**
 * Delete file from Supabase Storage
 * 
 * Use Cases:
 * - User cancels order (clean up uploaded files)
 * - Admin deletes old files (storage management)
 * - User removes cart item (optional cleanup)
 * 
 * Important: Files are referenced in orders table.
 * Only delete if order is cancelled/expired.
 * 
 * @param bucket - Storage bucket ('design-files' or 'sketch-files')
 * @param filePath - File path in bucket (e.g., 'uploads/123_abc.dxf')
 * @throws Error on deletion failure
 * 
 * @example
 * await deleteFile('design-files', 'uploads/1702389847123_k3x9m2p.dxf');
 */
export async function deleteFile(bucket: 'design-files' | 'sketch-files', filePath: string): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);
    
    if (error) {
      logError(error, 'deleteFile');
      throw new Error(`Delete failed: ${error.message}`);
    }
  } catch (error: any) {
    logError(error, 'deleteFile');
    throw error;
  }
}