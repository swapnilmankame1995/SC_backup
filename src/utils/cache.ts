/**
 * Cache utility for API responses
 * Implements in-memory and localStorage caching with TTL
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class CacheManager {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly STORAGE_PREFIX = 'cache_';

  /**
   * Get cached data
   * Checks memory cache first, then localStorage
   */
  get<T>(key: string): T | null {
    // Check memory cache first
    const memoryCached = this.memoryCache.get(key);
    if (memoryCached && !this.isExpired(memoryCached)) {
      return memoryCached.data as T;
    }

    // Check localStorage
    try {
      const stored = localStorage.getItem(this.STORAGE_PREFIX + key);
      if (stored) {
        const entry: CacheEntry<T> = JSON.parse(stored);
        if (!this.isExpired(entry)) {
          // Populate memory cache
          this.memoryCache.set(key, entry);
          return entry.data;
        } else {
          // Clean up expired entry
          localStorage.removeItem(this.STORAGE_PREFIX + key);
        }
      }
    } catch (error) {
      console.error('Cache get error:', error);
    }

    return null;
  }

  /**
   * Set cache data
   * Stores in both memory and localStorage
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    // Store in memory
    this.memoryCache.set(key, entry);

    // Store in localStorage
    try {
      localStorage.setItem(this.STORAGE_PREFIX + key, JSON.stringify(entry));
    } catch (error: any) {
      console.error('Cache set error:', error);
      if (error.name === 'QuotaExceededError') {
        // Clean up old cache entries
        this.cleanup();
        // Try again
        try {
          localStorage.setItem(this.STORAGE_PREFIX + key, JSON.stringify(entry));
        } catch (e) {
          console.error('Cache set failed after cleanup:', e);
        }
      }
    }
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): void {
    this.memoryCache.delete(key);
    try {
      localStorage.removeItem(this.STORAGE_PREFIX + key);
    } catch (error) {
      console.error('Cache invalidate error:', error);
    }
  }

  /**
   * Invalidate all cache entries matching prefix
   */
  invalidatePrefix(prefix: string): void {
    // Clear memory cache
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.memoryCache.delete(key);
      }
    }

    // Clear localStorage
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith(this.STORAGE_PREFIX + prefix)) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error('Cache invalidate prefix error:', error);
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.memoryCache.clear();
    
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith(this.STORAGE_PREFIX)) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    // Clean memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key);
      }
    }

    // Clean localStorage
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith(this.STORAGE_PREFIX)) {
          const stored = localStorage.getItem(key);
          if (stored) {
            try {
              const entry = JSON.parse(stored);
              if (this.isExpired(entry)) {
                localStorage.removeItem(key);
              }
            } catch (e) {
              // Invalid entry, remove it
              localStorage.removeItem(key);
            }
          }
        }
      }
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      memoryEntries: this.memoryCache.size,
      storageEntries: Object.keys(localStorage).filter(k => 
        k.startsWith(this.STORAGE_PREFIX)
      ).length,
    };
  }
}

// Export singleton instance
export const cache = new CacheManager();

// Run cleanup periodically (every 10 minutes)
if (typeof window !== 'undefined') {
  setInterval(() => {
    cache.cleanup();
  }, 10 * 60 * 1000);
}

/**
 * Helper function for cached API calls
 */
export async function cachedApiCall<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  const data = await fetcher();
  cache.set(key, data, ttl);
  return data;
}
