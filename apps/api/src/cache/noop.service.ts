import { CacheService } from './cache.types.js';

export class NoopCacheService implements CacheService {
  async get<T>(_key: string): Promise<T | null> {
    return null;
  }

  async set(_key: string, _value: unknown, _ttlSeconds?: number): Promise<void> {
    // No-op
  }

  async del(_key: string): Promise<void> {
    // No-op
  }

  async delPattern(_pattern: string): Promise<void> {
    // No-op
  }

  isAvailable(): boolean {
    return false;
  }

  async close(): Promise<void> {
    // No-op
  }
}

export const noopCacheService = new NoopCacheService();
