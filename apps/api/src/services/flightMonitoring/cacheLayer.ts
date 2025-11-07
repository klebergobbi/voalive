/**
 * Cache Layer for Flight Monitoring
 *
 * Features:
 * - Redis cache com TTL configurável (5-15 minutos)
 * - Distributed locks (evita requisições duplicadas)
 * - Histórico de mudanças
 * - Rate limiting por IP/usuário
 * - Cache warming
 * - Cache invalidation
 */

import { Redis } from 'ioredis';
import { FlightStatus } from './types';

// ============================================================================
// INTERFACES
// ============================================================================

export interface CacheConfig {
  ttl: number;                    // TTL em segundos (default: 900 = 15min)
  lockTTL: number;                // Lock TTL em segundos (default: 30s)
  maxHistory: number;             // Max histórico entries (default: 100)
  enableRateLimiting: boolean;    // Enable rate limiting (default: true)
  rateLimitWindow: number;        // Rate limit window em segundos (default: 60)
  rateLimitMax: number;          // Max requests per window (default: 10)
}

export interface CacheEntry {
  status: FlightStatus;
  lastUpdate: Date;
  attempts: number;
  nextCheck: Date | null;
  hitCount: number;
  source: 'CACHE' | 'API' | 'SCRAPING';
}

export interface CacheStats {
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  totalKeys: number;
  memoryUsage: number;
  avgTTL: number;
}

export interface RateLimitInfo {
  ip?: string;
  userId?: string;
  remaining: number;
  resetAt: Date;
  blocked: boolean;
}

export interface HistoryEntry {
  timestamp: Date;
  status: FlightStatus;
  changes: string[];
  source: string;
}

// ============================================================================
// CACHE LAYER CLASS
// ============================================================================

export class CacheLayer {
  private redis: Redis;
  private config: Required<CacheConfig>;

  // Cache key prefixes
  private readonly CACHE_PREFIX = 'flight';
  private readonly LOCK_PREFIX = 'lock:flight';
  private readonly HISTORY_PREFIX = 'history:flight';
  private readonly RATE_LIMIT_PREFIX = 'ratelimit';
  private readonly STATS_PREFIX = 'stats:cache';

  constructor(redisClient: Redis, config?: Partial<CacheConfig>) {
    this.redis = redisClient;

    this.config = {
      ttl: config?.ttl ?? 900,                           // 15 minutes
      lockTTL: config?.lockTTL ?? 30,                    // 30 seconds
      maxHistory: config?.maxHistory ?? 100,             // 100 entries
      enableRateLimiting: config?.enableRateLimiting ?? true,
      rateLimitWindow: config?.rateLimitWindow ?? 60,    // 1 minute
      rateLimitMax: config?.rateLimitMax ?? 10,          // 10 requests/min
    };
  }

  // ==========================================================================
  // 1. CACHE OPERATIONS
  // ==========================================================================

  /**
   * Get cached flight status
   */
  async get(bookingReference: string, lastName: string): Promise<CacheEntry | null> {
    try {
      const key = this.buildCacheKey(bookingReference, lastName);
      const cached = await this.redis.get(key);

      if (!cached) {
        await this.incrementStats('misses');
        return null;
      }

      const entry: CacheEntry = JSON.parse(cached);

      // Parse dates
      entry.lastUpdate = new Date(entry.lastUpdate);
      if (entry.nextCheck) {
        entry.nextCheck = new Date(entry.nextCheck);
      }
      if (entry.status.timestamp) {
        entry.status.timestamp = new Date(entry.status.timestamp);
      }

      // Increment hit count
      entry.hitCount++;
      await this.set(bookingReference, lastName, entry.status, {
        attempts: entry.attempts,
        nextCheck: entry.nextCheck,
        hitCount: entry.hitCount,
      });

      await this.incrementStats('hits');

      console.log(`✅ Cache HIT: ${key}`);
      return entry;

    } catch (error) {
      console.error('Error getting from cache:', error);
      return null;
    }
  }

  /**
   * Set flight status in cache
   */
  async set(
    bookingReference: string,
    lastName: string,
    status: FlightStatus,
    options?: {
      ttl?: number;
      attempts?: number;
      nextCheck?: Date | null;
      hitCount?: number;
    }
  ): Promise<boolean> {
    try {
      const key = this.buildCacheKey(bookingReference, lastName);

      const entry: CacheEntry = {
        status,
        lastUpdate: new Date(),
        attempts: options?.attempts ?? 1,
        nextCheck: options?.nextCheck ?? null,
        hitCount: options?.hitCount ?? 0,
        source: 'CACHE',
      };

      const ttl = options?.ttl ?? this.config.ttl;

      await this.redis.setex(key, ttl, JSON.stringify(entry));

      console.log(`💾 Cache SET: ${key} (TTL: ${ttl}s)`);
      return true;

    } catch (error) {
      console.error('Error setting cache:', error);
      return false;
    }
  }

  /**
   * Delete from cache
   */
  async delete(bookingReference: string, lastName: string): Promise<boolean> {
    try {
      const key = this.buildCacheKey(bookingReference, lastName);
      const deleted = await this.redis.del(key);

      console.log(`🗑️ Cache DELETE: ${key}`);
      return deleted > 0;

    } catch (error) {
      console.error('Error deleting from cache:', error);
      return false;
    }
  }

  /**
   * Check if exists in cache
   */
  async exists(bookingReference: string, lastName: string): Promise<boolean> {
    try {
      const key = this.buildCacheKey(bookingReference, lastName);
      const exists = await this.redis.exists(key);
      return exists === 1;

    } catch (error) {
      console.error('Error checking cache existence:', error);
      return false;
    }
  }

  /**
   * Get TTL (time to live) of cache entry
   */
  async getTTL(bookingReference: string, lastName: string): Promise<number> {
    try {
      const key = this.buildCacheKey(bookingReference, lastName);
      return await this.redis.ttl(key);

    } catch (error) {
      console.error('Error getting TTL:', error);
      return -1;
    }
  }

  /**
   * Refresh TTL (extend expiration)
   */
  async refreshTTL(
    bookingReference: string,
    lastName: string,
    ttl?: number
  ): Promise<boolean> {
    try {
      const key = this.buildCacheKey(bookingReference, lastName);
      const newTTL = ttl ?? this.config.ttl;

      const success = await this.redis.expire(key, newTTL);

      if (success) {
        console.log(`🔄 Cache TTL refreshed: ${key} (${newTTL}s)`);
      }

      return success === 1;

    } catch (error) {
      console.error('Error refreshing TTL:', error);
      return false;
    }
  }

  // ==========================================================================
  // 2. DISTRIBUTED LOCKS (evitar requisições simultâneas)
  // ==========================================================================

  /**
   * Acquire lock for a booking
   * Retorna true se conseguiu o lock, false se já está locked
   */
  async acquireLock(
    bookingReference: string,
    lastName: string,
    ttl?: number
  ): Promise<boolean> {
    try {
      const key = this.buildLockKey(bookingReference, lastName);
      const lockTTL = ttl ?? this.config.lockTTL;

      // SET NX (only if not exists) with expiration
      const result = await this.redis.set(
        key,
        Date.now().toString(),
        'EX',
        lockTTL,
        'NX'
      );

      if (result === 'OK') {
        console.log(`🔒 Lock ACQUIRED: ${key} (TTL: ${lockTTL}s)`);
        return true;
      }

      console.log(`⏳ Lock already exists: ${key}`);
      return false;

    } catch (error) {
      console.error('Error acquiring lock:', error);
      return false;
    }
  }

  /**
   * Release lock
   */
  async releaseLock(bookingReference: string, lastName: string): Promise<boolean> {
    try {
      const key = this.buildLockKey(bookingReference, lastName);
      const deleted = await this.redis.del(key);

      if (deleted > 0) {
        console.log(`🔓 Lock RELEASED: ${key}`);
        return true;
      }

      return false;

    } catch (error) {
      console.error('Error releasing lock:', error);
      return false;
    }
  }

  /**
   * Check if locked
   */
  async isLocked(bookingReference: string, lastName: string): Promise<boolean> {
    try {
      const key = this.buildLockKey(bookingReference, lastName);
      const exists = await this.redis.exists(key);
      return exists === 1;

    } catch (error) {
      console.error('Error checking lock:', error);
      return false;
    }
  }

  /**
   * Wait for lock to be released (with timeout)
   */
  async waitForLock(
    bookingReference: string,
    lastName: string,
    maxWaitMs: number = 10000
  ): Promise<boolean> {
    const startTime = Date.now();
    const pollInterval = 100; // Check every 100ms

    while (Date.now() - startTime < maxWaitMs) {
      const locked = await this.isLocked(bookingReference, lastName);

      if (!locked) {
        return true;
      }

      await this.sleep(pollInterval);
    }

    console.warn(`⏰ Lock wait timeout: ${bookingReference}`);
    return false;
  }

  /**
   * Execute with lock (automatically acquire and release)
   */
  async executeWithLock<T>(
    bookingReference: string,
    lastName: string,
    fn: () => Promise<T>,
    options?: {
      lockTTL?: number;
      maxWait?: number;
    }
  ): Promise<T> {
    // Try to acquire lock
    const acquired = await this.acquireLock(
      bookingReference,
      lastName,
      options?.lockTTL
    );

    if (!acquired) {
      // Wait for existing lock to be released
      const released = await this.waitForLock(
        bookingReference,
        lastName,
        options?.maxWait
      );

      if (!released) {
        throw new Error('Could not acquire lock - timeout');
      }

      // Try again
      const secondAttempt = await this.acquireLock(
        bookingReference,
        lastName,
        options?.lockTTL
      );

      if (!secondAttempt) {
        throw new Error('Could not acquire lock - second attempt failed');
      }
    }

    try {
      // Execute function
      return await fn();

    } finally {
      // Always release lock
      await this.releaseLock(bookingReference, lastName);
    }
  }

  // ==========================================================================
  // 3. HISTÓRICO DE MUDANÇAS
  // ==========================================================================

  /**
   * Add entry to history
   */
  async addToHistory(
    bookingReference: string,
    lastName: string,
    status: FlightStatus,
    changes?: string[]
  ): Promise<boolean> {
    try {
      const key = this.buildHistoryKey(bookingReference, lastName);

      const entry: HistoryEntry = {
        timestamp: new Date(),
        status,
        changes: changes || [],
        source: status.source,
      };

      // Add to list (newest first)
      await this.redis.lpush(key, JSON.stringify(entry));

      // Trim to max size
      await this.redis.ltrim(key, 0, this.config.maxHistory - 1);

      // Set expiration (30 days)
      await this.redis.expire(key, 30 * 24 * 60 * 60);

      console.log(`📜 History entry added: ${key}`);
      return true;

    } catch (error) {
      console.error('Error adding to history:', error);
      return false;
    }
  }

  /**
   * Get history
   */
  async getHistory(
    bookingReference: string,
    lastName: string,
    limit?: number
  ): Promise<HistoryEntry[]> {
    try {
      const key = this.buildHistoryKey(bookingReference, lastName);
      const max = limit ?? this.config.maxHistory;

      const items = await this.redis.lrange(key, 0, max - 1);

      return items.map(item => {
        const entry = JSON.parse(item);
        entry.timestamp = new Date(entry.timestamp);
        return entry;
      });

    } catch (error) {
      console.error('Error getting history:', error);
      return [];
    }
  }

  /**
   * Get changes between two history entries
   */
  async getChanges(
    bookingReference: string,
    lastName: string
  ): Promise<string[]> {
    try {
      const history = await this.getHistory(bookingReference, lastName, 2);

      if (history.length < 2) {
        return [];
      }

      const [current, previous] = history;
      const changes: string[] = [];

      // Compare statuses
      if (current.status.flight?.status !== previous.status.flight?.status) {
        changes.push(
          `Status changed: ${previous.status.flight?.status} → ${current.status.flight?.status}`
        );
      }

      // Compare gates
      if (current.status.flight?.departure.gate !== previous.status.flight?.departure.gate) {
        changes.push(
          `Gate changed: ${previous.status.flight?.departure.gate} → ${current.status.flight?.departure.gate}`
        );
      }

      // Compare delays
      const currentDelay = current.status.flight?.delay?.minutes ?? 0;
      const previousDelay = previous.status.flight?.delay?.minutes ?? 0;

      if (currentDelay !== previousDelay) {
        changes.push(`Delay changed: ${previousDelay}min → ${currentDelay}min`);
      }

      return changes;

    } catch (error) {
      console.error('Error getting changes:', error);
      return [];
    }
  }

  /**
   * Clear history
   */
  async clearHistory(bookingReference: string, lastName: string): Promise<boolean> {
    try {
      const key = this.buildHistoryKey(bookingReference, lastName);
      const deleted = await this.redis.del(key);

      console.log(`🗑️ History cleared: ${key}`);
      return deleted > 0;

    } catch (error) {
      console.error('Error clearing history:', error);
      return false;
    }
  }

  // ==========================================================================
  // 4. RATE LIMITING
  // ==========================================================================

  /**
   * Check rate limit for IP or user
   */
  async checkRateLimit(
    identifier: string,
    type: 'ip' | 'user' = 'ip'
  ): Promise<RateLimitInfo> {
    try {
      if (!this.config.enableRateLimiting) {
        return {
          remaining: Infinity,
          resetAt: new Date(Date.now() + this.config.rateLimitWindow * 1000),
          blocked: false,
        };
      }

      const key = this.buildRateLimitKey(identifier, type);

      // Get current count
      const current = await this.redis.get(key);
      const count = current ? parseInt(current, 10) : 0;

      // Check if blocked
      if (count >= this.config.rateLimitMax) {
        const ttl = await this.redis.ttl(key);

        console.warn(`🚫 Rate limit exceeded: ${identifier} (${type})`);

        return {
          [type === 'ip' ? 'ip' : 'userId']: identifier,
          remaining: 0,
          resetAt: new Date(Date.now() + ttl * 1000),
          blocked: true,
        };
      }

      return {
        [type === 'ip' ? 'ip' : 'userId']: identifier,
        remaining: this.config.rateLimitMax - count,
        resetAt: new Date(Date.now() + this.config.rateLimitWindow * 1000),
        blocked: false,
      };

    } catch (error) {
      console.error('Error checking rate limit:', error);
      return {
        remaining: 0,
        resetAt: new Date(),
        blocked: false,
      };
    }
  }

  /**
   * Increment rate limit counter
   */
  async incrementRateLimit(
    identifier: string,
    type: 'ip' | 'user' = 'ip'
  ): Promise<number> {
    try {
      if (!this.config.enableRateLimiting) {
        return 1;
      }

      const key = this.buildRateLimitKey(identifier, type);

      // Increment
      const count = await this.redis.incr(key);

      // Set expiration on first increment
      if (count === 1) {
        await this.redis.expire(key, this.config.rateLimitWindow);
      }

      console.log(`📊 Rate limit: ${identifier} (${type}) - ${count}/${this.config.rateLimitMax}`);

      return count;

    } catch (error) {
      console.error('Error incrementing rate limit:', error);
      return 0;
    }
  }

  /**
   * Reset rate limit for identifier
   */
  async resetRateLimit(identifier: string, type: 'ip' | 'user' = 'ip'): Promise<boolean> {
    try {
      const key = this.buildRateLimitKey(identifier, type);
      const deleted = await this.redis.del(key);

      console.log(`🔄 Rate limit reset: ${identifier} (${type})`);
      return deleted > 0;

    } catch (error) {
      console.error('Error resetting rate limit:', error);
      return false;
    }
  }

  // ==========================================================================
  // 5. CACHE STATISTICS
  // ==========================================================================

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      const [hits, misses] = await Promise.all([
        this.redis.get(`${this.STATS_PREFIX}:hits`),
        this.redis.get(`${this.STATS_PREFIX}:misses`),
      ]);

      const totalHits = hits ? parseInt(hits, 10) : 0;
      const totalMisses = misses ? parseInt(misses, 10) : 0;
      const total = totalHits + totalMisses;

      // Get all cache keys
      const keys = await this.redis.keys(`${this.CACHE_PREFIX}:*`);
      const totalKeys = keys.length;

      // Get memory usage (Redis INFO command)
      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const memoryUsage = memoryMatch ? parseInt(memoryMatch[1], 10) : 0;

      // Calculate average TTL
      let totalTTL = 0;
      if (totalKeys > 0) {
        const ttls = await Promise.all(
          keys.slice(0, 100).map(key => this.redis.ttl(key))
        );
        totalTTL = ttls.reduce((sum, ttl) => sum + (ttl > 0 ? ttl : 0), 0);
      }

      return {
        totalHits,
        totalMisses,
        hitRate: total > 0 ? (totalHits / total) * 100 : 0,
        totalKeys,
        memoryUsage,
        avgTTL: totalKeys > 0 ? totalTTL / Math.min(totalKeys, 100) : 0,
      };

    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        totalHits: 0,
        totalMisses: 0,
        hitRate: 0,
        totalKeys: 0,
        memoryUsage: 0,
        avgTTL: 0,
      };
    }
  }

  /**
   * Reset statistics
   */
  async resetStats(): Promise<boolean> {
    try {
      await Promise.all([
        this.redis.del(`${this.STATS_PREFIX}:hits`),
        this.redis.del(`${this.STATS_PREFIX}:misses`),
      ]);

      console.log('📊 Stats reset');
      return true;

    } catch (error) {
      console.error('Error resetting stats:', error);
      return false;
    }
  }

  /**
   * Increment stats counter
   */
  private async incrementStats(type: 'hits' | 'misses'): Promise<void> {
    try {
      await this.redis.incr(`${this.STATS_PREFIX}:${type}`);
    } catch (error) {
      console.error(`Error incrementing stats (${type}):`, error);
    }
  }

  // ==========================================================================
  // 6. CACHE WARMING & INVALIDATION
  // ==========================================================================

  /**
   * Warm cache with data
   */
  async warmCache(entries: Array<{
    bookingReference: string;
    lastName: string;
    status: FlightStatus;
  }>): Promise<number> {
    try {
      let warmed = 0;

      for (const entry of entries) {
        const success = await this.set(
          entry.bookingReference,
          entry.lastName,
          entry.status
        );

        if (success) warmed++;
      }

      console.log(`🔥 Cache warmed: ${warmed}/${entries.length} entries`);
      return warmed;

    } catch (error) {
      console.error('Error warming cache:', error);
      return 0;
    }
  }

  /**
   * Invalidate all cache for a pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);

      if (keys.length === 0) {
        return 0;
      }

      const deleted = await this.redis.del(...keys);

      console.log(`🗑️ Invalidated ${deleted} keys matching: ${pattern}`);
      return deleted;

    } catch (error) {
      console.error('Error invalidating pattern:', error);
      return 0;
    }
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<boolean> {
    try {
      const patterns = [
        `${this.CACHE_PREFIX}:*`,
        `${this.LOCK_PREFIX}:*`,
        `${this.HISTORY_PREFIX}:*`,
      ];

      let totalDeleted = 0;

      for (const pattern of patterns) {
        const deleted = await this.invalidatePattern(pattern);
        totalDeleted += deleted;
      }

      console.log(`🗑️ Cleared all cache: ${totalDeleted} keys`);
      return true;

    } catch (error) {
      console.error('Error clearing all cache:', error);
      return false;
    }
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /**
   * Build cache key
   */
  private buildCacheKey(bookingReference: string, lastName: string): string {
    return `${this.CACHE_PREFIX}:${bookingReference.toUpperCase()}:${lastName.toUpperCase()}`;
  }

  /**
   * Build lock key
   */
  private buildLockKey(bookingReference: string, lastName: string): string {
    return `${this.LOCK_PREFIX}:${bookingReference.toUpperCase()}:${lastName.toUpperCase()}`;
  }

  /**
   * Build history key
   */
  private buildHistoryKey(bookingReference: string, lastName: string): string {
    return `${this.HISTORY_PREFIX}:${bookingReference.toUpperCase()}:${lastName.toUpperCase()}`;
  }

  /**
   * Build rate limit key
   */
  private buildRateLimitKey(identifier: string, type: 'ip' | 'user'): string {
    return `${this.RATE_LIMIT_PREFIX}:${type}:${identifier}`;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let cacheLayerInstance: CacheLayer | null = null;

/**
 * Get or create CacheLayer instance
 */
export function getCacheLayer(
  redisClient?: Redis,
  config?: Partial<CacheConfig>
): CacheLayer {
  if (!cacheLayerInstance) {
    if (!redisClient) {
      throw new Error('CacheLayer requires Redis client on first initialization');
    }

    cacheLayerInstance = new CacheLayer(redisClient, config);
  }

  return cacheLayerInstance;
}

/**
 * Reset cache layer instance (for testing)
 */
export function resetCacheLayer(): void {
  cacheLayerInstance = null;
}

export default CacheLayer;
