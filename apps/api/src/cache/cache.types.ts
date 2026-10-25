import { EventListQuery } from '../types/event.types.js';

export interface CacheService {
  /**
   * Retrieves a cached value by key.
   * Returns null if key is not found, expired, or if cache is unavailable.
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Stores a value in cache with a specified or default TTL in seconds.
   * Silently no-ops if cache is unavailable.
   */
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;

  /**
   * Deletes a single key from cache.
   * Silently no-ops if cache is unavailable.
   */
  del(key: string): Promise<void>;

  /**
   * Deletes all keys matching a glob pattern using safe non-blocking SCAN.
   * Silently no-ops if cache is unavailable.
   */
  delPattern(pattern: string): Promise<void>;

  /**
   * Checks if the cache layer is currently active and reachable.
   */
  isAvailable(): boolean;

  /**
   * Closes active cache connections gracefully.
   */
  close(): Promise<void>;
}

export const CACHE_PREFIX = 'festconnect';

/**
 * Builds a deterministic, normalized cache key for public event listings.
 * Ensures query parameter ordering does not cause duplicate cache keys.
 */
export function buildEventListCacheKey(query: EventListQuery): string {
  const page = query.page && query.page > 0 ? query.page : 1;
  const limit = query.limit && query.limit > 0 ? query.limit : 10;
  const eventType = query.event_type ? query.event_type.trim().toLowerCase() : 'all';
  const status = query.status ? query.status.trim().toUpperCase() : 'all';
  const search = query.search ? query.search.trim().toLowerCase() : 'none';

  return `${CACHE_PREFIX}:events:list:limit=${limit}&page=${page}&search=${search}&status=${status}&type=${eventType}`;
}

/**
 * Builds a deterministic cache key for single event details.
 */
export function buildEventDetailCacheKey(eventId: number): string {
  return `${CACHE_PREFIX}:events:detail:${eventId}`;
}

/**
 * Builds a deterministic cache key for event schedules.
 */
export function buildEventSchedulesCacheKey(eventId: number): string {
  return `${CACHE_PREFIX}:events:schedules:${eventId}`;
}
