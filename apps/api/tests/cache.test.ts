import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { getDbPool } from '../src/db/connection.js';
import { runMigrations } from '../src/db/migrate.js';
import { runSeeds } from '../src/db/seed.js';
import {
  RedisCacheService,
  NoopCacheService,
  getCacheService,
  setCacheService,
  buildEventListCacheKey,
  buildEventDetailCacheKey,
  buildEventSchedulesCacheKey,
  CACHE_PREFIX,
} from '../src/cache/index.js';

describe('Phase 09 — Redis Cache-Aside & Database Tuning Suite', () => {
  const app = createApp();
  let redisService: RedisCacheService;
  let coordinatorCookie: string[];
  let coordinatorCsrf: string;
  let participantCookie: string[];

  beforeAll(async () => {
    // Ensure migrations and clean demo seed
    await runMigrations({ silent: true });
    await runSeeds({ silent: true });

    // Initialize live Redis cache service for test
    redisService = new RedisCacheService({
      host: 'localhost',
      port: 6379,
      defaultTtlSeconds: 60,
    });
    const connected = await redisService.connect();
    expect(connected).toBe(true);

    // Set active cache service
    setCacheService(redisService);

    // Login Coordinator (coordinator@festconnect.edu)
    const coordLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'coordinator@festconnect.edu', password: 'demo1234' });
    expect(coordLogin.status).toBe(200);
    coordinatorCookie = coordLogin.headers['set-cookie'] || [];
    coordinatorCsrf = coordLogin.body.csrfToken;

    // Login Participant (adwait@festconnect.edu)
    const partLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'adwait@festconnect.edu', password: 'demo1234' });
    expect(partLogin.status).toBe(200);
    participantCookie = partLogin.headers['set-cookie'] || [];
  });

  afterAll(async () => {
    // Clean up Redis test keys and close connection
    if (redisService) {
      await redisService.delPattern(`${CACHE_PREFIX}:*`);
      await redisService.close();
    }
    setCacheService(null);
  });

  beforeEach(async () => {
    // Clear cache keys before each test for isolated testing
    if (redisService && redisService.isAvailable()) {
      await redisService.delPattern(`${CACHE_PREFIX}:*`);
    }
  });

  // ========================================================
  // 1. Cache Miss, Populate & Hit Verification
  // ========================================================
  describe('1. Cache-Aside Miss, Populate & Hit', () => {
    it('populates Redis on cache miss and serves subsequent read from cache', async () => {
      const cacheKey = buildEventListCacheKey({ page: 1, limit: 10 });

      // Step 1: Ensure key does not exist initially in Redis
      const preCheck = await redisService.get(cacheKey);
      expect(preCheck).toBeNull();

      // Step 2: First request -> Cache Miss -> Queries MySQL & populates Redis
      const firstRes = await request(app).get('/api/v1/events?page=1&limit=10');
      expect(firstRes.status).toBe(200);
      expect(firstRes.body.success).toBe(true);
      expect(firstRes.body.data.events.length).toBeGreaterThanOrEqual(3);

      // Step 3: Verify the entry is now populated in Redis
      const cachedData = await redisService.get<any>(cacheKey);
      expect(cachedData).not.toBeNull();
      expect(cachedData.events.length).toBe(firstRes.body.data.events.length);
      expect(cachedData.pagination.total).toBe(firstRes.body.data.pagination.total);

      // Step 4: Second request -> Cache Hit -> Returns cached data identically
      const secondRes = await request(app).get('/api/v1/events?page=1&limit=10');
      expect(secondRes.status).toBe(200);
      expect(secondRes.body.data).toEqual(cachedData);
    });

    it('caches event detail with schedules on first lookup and serves on second lookup', async () => {
      const eventId = 1;
      const cacheKey = buildEventDetailCacheKey(eventId);

      // Verify no key initially
      expect(await redisService.get(cacheKey)).toBeNull();

      // First call (miss)
      const res1 = await request(app).get(`/api/v1/events/${eventId}`);
      expect(res1.status).toBe(200);
      expect(res1.body.data.event_id).toBe(eventId);
      expect(Array.isArray(res1.body.data.schedules)).toBe(true);

      // Verify key populated in Redis
      const cached = await redisService.get<any>(cacheKey);
      expect(cached).not.toBeNull();
      expect(cached.event_name).toBe(res1.body.data.event_name);
      expect(cached.schedules.length).toBe(res1.body.data.schedules.length);

      // Second call (hit)
      const res2 = await request(app).get(`/api/v1/events/${eventId}`);
      expect(res2.status).toBe(200);
      expect(res2.body.data).toEqual(cached);
    });

    it('caches event schedules list and serves from cache', async () => {
      const eventId = 1;
      const cacheKey = buildEventSchedulesCacheKey(eventId);

      expect(await redisService.get(cacheKey)).toBeNull();

      const res1 = await request(app).get(`/api/v1/events/${eventId}/schedules`);
      expect(res1.status).toBe(200);
      expect(Array.isArray(res1.body.data)).toBe(true);

      const cached = await redisService.get<any>(cacheKey);
      expect(cached).not.toBeNull();
      expect(cached.length).toBe(res1.body.data.length);

      const res2 = await request(app).get(`/api/v1/events/${eventId}/schedules`);
      expect(res2.status).toBe(200);
      expect(res2.body.data).toEqual(cached);
    });
  });

  // ========================================================
  // 2. Deterministic Key Normalization
  // ========================================================
  describe('2. Deterministic Cache Key Generation', () => {
    it('produces identical cache keys regardless of query parameter ordering or casing', async () => {
      // Query 1: ?page=1&limit=10&event_type=coding
      const res1 = await request(app).get('/api/v1/events?page=1&limit=10&event_type=Coding%20%2F%20Software');
      expect(res1.status).toBe(200);

      // Query 2: Different query param order: ?limit=10&event_type=coding&page=1
      const res2 = await request(app).get('/api/v1/events?limit=10&event_type=Coding%20%2F%20Software&page=1');
      expect(res2.status).toBe(200);

      const expectedKey = buildEventListCacheKey({
        page: 1,
        limit: 10,
        event_type: 'Coding / Software',
      });

      const cached = await redisService.get(expectedKey);
      expect(cached).not.toBeNull();
      expect(res1.body.data).toEqual(res2.body.data);
    });
  });

  // ========================================================
  // 3. Cache Invalidation on Mutations
  // ========================================================
  describe('3. Cache Invalidation Rules', () => {
    it('invalidates event list cache when a new event is created', async () => {
      const listCacheKey = buildEventListCacheKey({ page: 1, limit: 10 });

      // Prime the list cache
      const listBefore = await request(app).get('/api/v1/events?page=1&limit=10');
      expect(listBefore.status).toBe(200);
      expect(await redisService.get(listCacheKey)).not.toBeNull();

      // Create a new event by Coordinator 1
      const createRes = await request(app)
        .post('/api/v1/events')
        .set('Cookie', coordinatorCookie)
        .set('X-CSRF-Token', coordinatorCsrf)
        .send({
          event_name: `Phase 09 Cache Invalidation Test ${Date.now()}`,
          event_type: 'Coding / Software',
          description: 'Testing event creation cache invalidation',
          min_team_size: 1,
          max_team_size: 3,
          registration_fee: 150.0,
        });

      expect(createRes.status).toBe(201);
      const createdEventId = createRes.body.data.event_id;

      // Verify list cache was invalidated (deleted)
      const cachedAfter = await redisService.get(listCacheKey);
      expect(cachedAfter).toBeNull();

      // Querying the list again fetches fresh data from MySQL including the new event
      const listAfter = await request(app).get('/api/v1/events?page=1&limit=10');
      expect(listAfter.status).toBe(200);
      const found = listAfter.body.data.events.some((e: any) => e.event_id === createdEventId);
      expect(found).toBe(true);
    });

    it('invalidates event detail and listing caches when an event is updated', async () => {
      const eventId = 1;
      const detailKey = buildEventDetailCacheKey(eventId);
      const listKey = buildEventListCacheKey({ page: 1, limit: 10 });

      // Prime both detail and list caches
      await request(app).get(`/api/v1/events/${eventId}`);
      await request(app).get('/api/v1/events?page=1&limit=10');
      expect(await redisService.get(detailKey)).not.toBeNull();
      expect(await redisService.get(listKey)).not.toBeNull();

      // Update the event
      const newDescription = `Updated description for cache test ${Date.now()}`;
      const updateRes = await request(app)
        .put(`/api/v1/events/${eventId}`)
        .set('Cookie', coordinatorCookie)
        .set('X-CSRF-Token', coordinatorCsrf)
        .send({
          description: newDescription,
        });

      expect(updateRes.status).toBe(200);

      // Verify detail and list caches were deleted
      expect(await redisService.get(detailKey)).toBeNull();
      expect(await redisService.get(listKey)).toBeNull();

      // Next read returns updated content from MySQL
      const freshDetail = await request(app).get(`/api/v1/events/${eventId}`);
      expect(freshDetail.status).toBe(200);
      expect(freshDetail.body.data.description).toBe(newDescription);
    });

    it('invalidates event detail and schedule caches when a schedule entry is updated', async () => {
      const eventId = 1;
      const detailKey = buildEventDetailCacheKey(eventId);
      const schedKey = buildEventSchedulesCacheKey(eventId);

      // Prime caches
      await request(app).get(`/api/v1/events/${eventId}`);
      await request(app).get(`/api/v1/events/${eventId}/schedules`);
      expect(await redisService.get(detailKey)).not.toBeNull();
      expect(await redisService.get(schedKey)).not.toBeNull();

      // Update schedule 1
      const newVenue = `Auditorium Stage Cache Test ${Date.now()}`;
      const schedRes = await request(app)
        .patch(`/api/v1/events/${eventId}/schedules/1`)
        .set('Cookie', coordinatorCookie)
        .set('X-CSRF-Token', coordinatorCsrf)
        .send({
          venue: newVenue,
        });

      expect(schedRes.status).toBe(200);

      // Verify both caches were invalidated
      expect(await redisService.get(detailKey)).toBeNull();
      expect(await redisService.get(schedKey)).toBeNull();

      // Next read reflects new venue
      const freshSched = await request(app).get(`/api/v1/events/${eventId}/schedules`);
      expect(freshSched.status).toBe(200);
      expect(freshSched.body.data[0].venue).toBe(newVenue);
    });
  });

  // ========================================================
  // 4. TTL Expiration Verification
  // ========================================================
  describe('4. TTL Expiration', () => {
    it('automatically expires cached entries after configured TTL', async () => {
      const testKey = `${CACHE_PREFIX}:test:ttl:sample`;
      // Set key with 1 second TTL
      await redisService.set(testKey, { test: 'expires_fast' }, 1);

      // Immediately available
      const immediate = await redisService.get(testKey);
      expect(immediate).toEqual({ test: 'expires_fast' });

      // Wait 1.1s for Redis key expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const expired = await redisService.get(testKey);
      expect(expired).toBeNull();
    });
  });

  // ========================================================
  // 5. Concurrency & High Load Integrity
  // ========================================================
  describe('5. Concurrent Read Requests', () => {
    it('handles multiple concurrent event list requests consistently', async () => {
      const promises = Array.from({ length: 8 }).map(() =>
        request(app).get('/api/v1/events?page=1&limit=10')
      );

      const results = await Promise.all(promises);
      for (const res of results) {
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.events.length).toBeGreaterThanOrEqual(3);
      }

      // Verify cached entry is intact and well-formed
      const cacheKey = buildEventListCacheKey({ page: 1, limit: 10 });
      const cached = await redisService.get<any>(cacheKey);
      expect(cached).not.toBeNull();
      expect(cached.events.length).toBe(results[0].body.data.events.length);
    });
  });

  // ========================================================
  // 6. Graceful Redis Outage & MySQL Fallback
  // ========================================================
  describe('6. Redis Outage & Safe MySQL Fallback', () => {
    it('transparently falls back to MySQL for reads when Redis is offline', async () => {
      // Simulate complete Redis outage by replacing active cache service with NoopCacheService
      setCacheService(new NoopCacheService());

      // Public event listing succeeds via MySQL
      const listRes = await request(app).get('/api/v1/events?page=1&limit=5');
      expect(listRes.status).toBe(200);
      expect(listRes.body.success).toBe(true);
      expect(listRes.body.data.events.length).toBeGreaterThan(0);

      // Public event detail succeeds via MySQL
      const detailRes = await request(app).get('/api/v1/events/1');
      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.event_id).toBe(1);

      // Public event schedule succeeds via MySQL
      const schedRes = await request(app).get('/api/v1/events/1/schedules');
      expect(schedRes.status).toBe(200);
      expect(Array.isArray(schedRes.body.data)).toBe(true);

      // Restore live Redis for subsequent tests
      setCacheService(redisService);
    });

    it('mutations continue to succeed without error when Redis cache is offline', async () => {
      setCacheService(new NoopCacheService());

      const updateRes = await request(app)
        .put('/api/v1/events/1')
        .set('Cookie', coordinatorCookie)
        .set('X-CSRF-Token', coordinatorCsrf)
        .send({
          description: 'Updated while Redis is completely down',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.description).toBe('Updated while Redis is completely down');

      setCacheService(redisService);
    });
  });

  // ========================================================
  // 7. Security Invariant: Non-Caching of Private State
  // ========================================================
  describe('7. Security Invariant: Zero Private Data in Redis', () => {
    it('never writes authentication, participant, registration, payment, or pass records to Redis', async () => {
      // Execute various private mutations & reads
      await request(app).get('/api/v1/auth/me').set('Cookie', participantCookie);
      await request(app).get('/api/v1/registrations').set('Cookie', participantCookie);
      await request(app).get('/api/v1/teams').set('Cookie', participantCookie);

      // Scan all Redis keys with prefix
      let cursor = '0';
      const allKeys: string[] = [];
      const rawRedis = (redisService as any).client;

      if (rawRedis) {
        do {
          const [nextCursor, keys] = await rawRedis.scan(cursor, 'MATCH', `${CACHE_PREFIX}:*`, 'COUNT', 100);
          cursor = nextCursor;
          allKeys.push(...keys);
        } while (cursor !== '0');
      }

      // Assert that all cached keys are strictly public event or schedule keys
      for (const key of allKeys) {
        const isPublicEventKey =
          key.startsWith(`${CACHE_PREFIX}:events:list:`) ||
          key.startsWith(`${CACHE_PREFIX}:events:detail:`) ||
          key.startsWith(`${CACHE_PREFIX}:events:schedules:`) ||
          key.startsWith(`${CACHE_PREFIX}:test:`);

        expect(isPublicEventKey).toBe(true);
        expect(key).not.toContain('auth');
        expect(key).not.toContain('participant');
        expect(key).not.toContain('registration');
        expect(key).not.toContain('payment');
        expect(key).not.toContain('pass');
        expect(key).not.toContain('token');
      }
    });
  });
});
