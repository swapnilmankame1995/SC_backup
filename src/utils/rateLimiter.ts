/**
 * Client-side Rate Limiter
 * Prevents spam and abuse
 * 
 * Note: This is client-side only. In production, you should also
 * implement server-side rate limiting.
 */

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

class RateLimiter {
  private attempts: Map<string, number[]> = new Map();

  /**
   * Check if action is allowed
   * @param key - Unique identifier for the action (e.g., 'login:user@email.com')
   * @param config - Rate limit configuration
   * @returns true if allowed, false if rate limited
   */
  isAllowed(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Get existing attempts for this key
    let keyAttempts = this.attempts.get(key) || [];

    // Remove attempts outside the time window
    keyAttempts = keyAttempts.filter(timestamp => timestamp > windowStart);

    // Check if limit exceeded
    if (keyAttempts.length >= config.maxAttempts) {
      return false;
    }

    // Add current attempt
    keyAttempts.push(now);
    this.attempts.set(key, keyAttempts);

    return true;
  }

  /**
   * Get remaining attempts
   */
  getRemainingAttempts(key: string, config: RateLimitConfig): number {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    let keyAttempts = this.attempts.get(key) || [];
    keyAttempts = keyAttempts.filter(timestamp => timestamp > windowStart);

    return Math.max(0, config.maxAttempts - keyAttempts.length);
  }

  /**
   * Get time until reset (in ms)
   */
  getTimeUntilReset(key: string, config: RateLimitConfig): number {
    const keyAttempts = this.attempts.get(key);
    if (!keyAttempts || keyAttempts.length === 0) {
      return 0;
    }

    const oldestAttempt = Math.min(...keyAttempts);
    const resetTime = oldestAttempt + config.windowMs;
    const now = Date.now();

    return Math.max(0, resetTime - now);
  }

  /**
   * Clear rate limit for a key
   */
  clear(key: string): void {
    this.attempts.delete(key);
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// Common rate limit configs
export const RateLimits = {
  // Login: 5 attempts per 15 minutes
  LOGIN: { maxAttempts: 5, windowMs: 15 * 60 * 1000 },
  
  // Signup: 3 attempts per hour
  SIGNUP: { maxAttempts: 3, windowMs: 60 * 60 * 1000 },
  
  // File upload: 20 files per 10 minutes
  FILE_UPLOAD: { maxAttempts: 20, windowMs: 10 * 60 * 1000 },
  
  // Order placement: 10 orders per hour
  ORDER_PLACEMENT: { maxAttempts: 10, windowMs: 60 * 60 * 1000 },
  
  // Email subscription: 3 per day
  EMAIL_SUBSCRIBE: { maxAttempts: 3, windowMs: 24 * 60 * 60 * 1000 },
};

/**
 * Format time until reset in human-readable format
 */
export function formatTimeUntilReset(ms: number): string {
  const minutes = Math.ceil(ms / 1000 / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  const hours = Math.ceil(minutes / 60);
  return `${hours} hour${hours !== 1 ? 's' : ''}`;
}
