import { CacheService } from './cache.types.js';
import { RedisCacheService } from './redis.service.js';
import { noopCacheService } from './noop.service.js';
import { getEnv } from '../config/env.js';

let activeCacheService: CacheService | null = null;

export function getCacheService(): CacheService {
  if (activeCacheService) {
    return activeCacheService;
  }

  const env = getEnv();
  if (env.REDIS_ENABLED) {
    const redisService = new RedisCacheService();
    // Fire background connection attempt
    redisService.connect().catch(() => {
      // Handled internally by RedisCacheService
    });
    activeCacheService = redisService;
  } else {
    activeCacheService = noopCacheService;
  }

  return activeCacheService;
}

/**
 * Overrides or resets the active cache service (used in tests for simulating outages or custom instances).
 */
export function setCacheService(service: CacheService | null): void {
  activeCacheService = service;
}
