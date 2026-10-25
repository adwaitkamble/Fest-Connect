import { Redis, RedisOptions } from 'ioredis';
import { CacheService } from './cache.types.js';
import { getEnv } from '../config/env.js';

export interface RedisConfigOptions {
  host?: string;
  port?: number;
  password?: string;
  defaultTtlSeconds?: number;
}

export class RedisCacheService implements CacheService {
  private client: Redis | null = null;
  private isConnected = false;
  private defaultTtl: number;

  constructor(options?: RedisConfigOptions) {
    const env = getEnv();
    const host = options?.host ?? env.REDIS_HOST;
    const port = options?.port ?? env.REDIS_PORT;
    const password = options?.password ?? env.REDIS_PASSWORD;
    this.defaultTtl = options?.defaultTtlSeconds ?? env.CACHE_DEFAULT_TTL_SECONDS;

    try {
      const redisOptions: RedisOptions = {
        host,
        port,
        password: password || undefined,
        lazyConnect: true,
        enableOfflineQueue: false, // Fail immediately if disconnected rather than buffering in memory
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        retryStrategy: (times) => {
          // Linear backoff with cap at 3000ms
          return Math.min(times * 200, 3000);
        },
      };

      this.client = new Redis(redisOptions);

      this.client.on('connect', () => {
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        this.isConnected = true;
      });

      this.client.on('error', (err: Error) => {
        this.isConnected = false;
        // Suppress verbose reconnect spam; concise warning
        if (env.NODE_ENV !== 'test') {
          console.warn(`[RedisCache] Warning: Connection error (${err.message}). Safe MySQL fallback active.`);
        }
      });

      this.client.on('close', () => {
        this.isConnected = false;
      });
    } catch (err: unknown) {
      this.client = null;
      this.isConnected = false;
      console.warn(`[RedisCache] Failed to initialize Redis client: ${(err as Error).message}. Safe MySQL fallback active.`);
    }
  }

  /**
   * Explicitly ensures the Redis client is connected.
   */
  async connect(): Promise<boolean> {
    if (!this.client) return false;
    if (this.isConnected) return true;
    try {
      await this.client.connect();
      this.isConnected = true;
      return true;
    } catch {
      this.isConnected = false;
      return false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const raw = await this.client.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      // Graceful fallback to MySQL on any read failure
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;
    try {
      const ttl = ttlSeconds ?? this.defaultTtl;
      const payload = JSON.stringify(value);
      if (ttl > 0) {
        await this.client.set(key, payload, 'EX', ttl);
      } else {
        await this.client.set(key, payload);
      }
    } catch {
      // Graceful degradation: cache write failure must never fail the underlying transaction
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch {
      // Graceful degradation
    }
  }

  async delPattern(pattern: string): Promise<void> {
    if (!this.client) return;
    try {
      // Use non-blocking SCAN instead of KEYS * to avoid blocking the Redis server
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } while (cursor !== '0');
    } catch {
      // Graceful degradation
    }
  }

  isAvailable(): boolean {
    return this.isConnected;
  }

  async close(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        this.client.disconnect();
      } finally {
        this.isConnected = false;
        this.client = null;
      }
    }
  }
}
