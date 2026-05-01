/**
 * Date Formatting Utilities
 * 
 * Handles proper UTC to IST timezone conversion for timestamps from Supabase.
 * 
 * ISSUE: Supabase returns timestamps without 'Z' suffix (e.g., "2025-12-17T18:25:01.692")
 * When JavaScript parses timestamps without timezone indicators, it assumes LOCAL time.
 * This causes incorrect timezone conversions.
 * 
 * SOLUTION: Add 'Z' suffix to force UTC parsing, then convert to IST for display.
 */

/**
 * Ensures timestamp has proper UTC indicator (Z suffix)
 * @param timestamp - ISO timestamp string (may be missing Z suffix)
 * @returns Timestamp with Z suffix
 */
export function ensureUTCTimestamp(timestamp: string): string {
  if (!timestamp) return timestamp;
  
  // If already has timezone indicator, return as-is
  if (timestamp.endsWith('Z') || timestamp.includes('+')) {
    return timestamp;
  }
  
  // Add Z suffix to indicate UTC
  return timestamp + 'Z';
}

/**
 * Formats a UTC timestamp to IST (Indian Standard Time)
 * @param timestamp - UTC timestamp string
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string in IST
 */
export function formatToIST(
  timestamp: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const utcTimestamp = ensureUTCTimestamp(timestamp);
  const date = new Date(utcTimestamp);
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    ...options
  };
  
  return date.toLocaleString('en-IN', defaultOptions);
}

/**
 * Formats a UTC timestamp to IST date only
 * @param timestamp - UTC timestamp string
 * @returns Formatted date string (e.g., "17 Dec 2025")
 */
export function formatDateIST(timestamp: string): string {
  return formatToIST(timestamp, {
    dateStyle: 'medium'
  });
}

/**
 * Formats a UTC timestamp to IST date and time
 * @param timestamp - UTC timestamp string
 * @returns Formatted datetime string (e.g., "17 Dec 2025, 11:55 pm")
 */
export function formatDateTimeIST(timestamp: string): string {
  return formatToIST(timestamp, {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

/**
 * Formats a UTC timestamp to IST time only
 * @param timestamp - UTC timestamp string
 * @returns Formatted time string (e.g., "11:55 pm")
 */
export function formatTimeIST(timestamp: string): string {
  return formatToIST(timestamp, {
    timeStyle: 'short'
  });
}
