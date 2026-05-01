import { projectId, publicAnonKey } from './supabase/info';

// Configuration for cost optimization
const SESSION_CONFIG = {
  // Only track X% of sessions (1-100). Set to 100 to track all.
  SAMPLING_RATE: 20, // Track 20% of sessions to save costs
  
  // Cooldown between tracking calls (ms)
  TRACKING_COOLDOWN: 30000, // 30 seconds minimum between tracks
  
  // Session duration before expiry
  SESSION_DURATION: 30 * 60 * 1000, // 30 minutes
  
  // Enable/disable tracking entirely
  // ⚠️ DISABLED to save server costs - Use Google Analytics instead (FREE, unlimited)
  // To re-enable: Change to true and deploy
  ENABLED: false,
};

// Track last tracking time to implement cooldown
let lastTrackTime = 0;

// Generate a unique session ID
function generateSessionId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}`;
}

// Check if this session should be tracked (sampling)
function shouldTrackSession(): boolean {
  if (!SESSION_CONFIG.ENABLED) return false;
  
  const TRACKING_KEY = 'sheetcutters_tracking_enabled';
  let shouldTrack = sessionStorage.getItem(TRACKING_KEY);
  
  if (shouldTrack === null) {
    // First time - decide if we should track this session
    const random = Math.random() * 100;
    shouldTrack = random < SESSION_CONFIG.SAMPLING_RATE ? 'true' : 'false';
    sessionStorage.setItem(TRACKING_KEY, shouldTrack);
  }
  
  return shouldTrack === 'true';
}

// Get or create session ID
function getSessionId(): string {
  const SESSION_KEY = 'sheetcutters_session_id';
  const SESSION_EXPIRY_KEY = 'sheetcutters_session_expiry';

  let sessionId = sessionStorage.getItem(SESSION_KEY);
  const expiry = sessionStorage.getItem(SESSION_EXPIRY_KEY);

  // Check if session has expired
  if (sessionId && expiry) {
    const expiryTime = parseInt(expiry, 10);
    if (Date.now() > expiryTime) {
      sessionId = null;
    }
  }

  // Create new session if needed
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }

  // Update expiry time
  const newExpiry = Date.now() + SESSION_CONFIG.SESSION_DURATION;
  sessionStorage.setItem(SESSION_EXPIRY_KEY, newExpiry.toString());

  return sessionId;
}

// Track page view with cooldown
export async function trackPageView(page?: string) {
  try {
    // Check if tracking is enabled and sampled for this session
    if (!shouldTrackSession()) {
      return;
    }
    
    // Implement cooldown to prevent excessive tracking
    const now = Date.now();
    if (now - lastTrackTime < SESSION_CONFIG.TRACKING_COOLDOWN) {
      return; // Skip tracking if within cooldown period
    }
    lastTrackTime = now;
    
    const sessionId = getSessionId();
    const userAgent = navigator.userAgent;
    const referrer = document.referrer;
    const currentPage = page || window.location.pathname;

    // Send tracking data to backend (fire and forget - no await)
    fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8927474f/track/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`
      },
      body: JSON.stringify({
        sessionId,
        page: currentPage,
        userAgent,
        referrer
      }),
      // Use keepalive to ensure request completes even if page closes
      keepalive: true
    }).catch(() => {
      // Silently ignore errors
    });
  } catch (error) {
    // Silently fail - don't break the app
    console.debug('Session tracking error:', error);
  }
}

// Track session on initial load and page changes
export function initializeSessionTracking() {
  // Track initial page load
  trackPageView();

  // Track navigation using history API
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function(...args) {
    originalPushState.apply(history, args);
    trackPageView();
  };

  history.replaceState = function(...args) {
    originalReplaceState.apply(history, args);
    trackPageView();
  };

  // Track popstate events (browser back/forward)
  window.addEventListener('popstate', () => {
    trackPageView();
  });

  // Track visibility changes (user returns to tab) - less frequently
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      trackPageView();
    }
  });
}

// Export configuration so it can be changed if needed
export { SESSION_CONFIG };
