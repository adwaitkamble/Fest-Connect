import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { authService } from '../src/services/auth.service.js';
import { getDbPool } from '../src/db/connection.js';

describe('Phase 04 — Event and Schedule Management Integration Suite', () => {
  const app = createApp();

  let adminToken: string;
  let coordinatorToken: string;
  let participantToken: string;
  let coordinatorCsrfToken: string;
  let coordinatorCookie: string;

  beforeAll(async () => {
    const pool = getDbPool();
    await pool.query('DELETE FROM `schedule` WHERE `event_id` > 3');
    await pool.query('DELETE FROM `event` WHERE `event_id` > 3');

    // 1. Get tokens for demo accounts
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@festconnect.edu', password: 'demo1234' });
    const rawAdminCookie = adminLogin.headers['set-cookie']?.[0] || '';
    adminToken = rawAdminCookie.match(/festconnect_token=([^;]+)/)?.[1] || '';

    const coordLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'coordinator@festconnect.edu', password: 'demo1234' });
    const rawCoordCookie = coordLogin.headers['set-cookie']?.[0] || '';
    coordinatorToken = rawCoordCookie.match(/festconnect_token=([^;]+)/)?.[1] || '';
    coordinatorCookie = coordLogin.headers['set-cookie'];
    coordinatorCsrfToken = coordLogin.body.csrfToken;

    const partLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'adwait@festconnect.edu', password: 'demo1234' });
    const rawPartCookie = partLogin.headers['set-cookie']?.[0] || '';
    participantToken = rawPartCookie.match(/festconnect_token=([^;]+)/)?.[1] || '';
  });

  // ==========================================
  // 1. Public Event Discovery
  // ==========================================
  describe('1. Public Event Listing (GET /api/v1/events)', () => {
    it('returns a paginated list of events with default page and limit', async () => {
      const res = await request(app).get('/api/v1/events');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.events)).toBe(true);
      expect(res.body.data.events.length).toBeGreaterThanOrEqual(3);

      const pagination = res.body.data.pagination;
      expect(pagination.page).toBe(1);
      expect(pagination.limit).toBe(10);
      expect(pagination.total).toBeGreaterThanOrEqual(3);
      expect(pagination.totalPages).toBeGreaterThanOrEqual(1);

      // Verify structure of an event item
      const ev = res.body.data.events[0];
      expect(ev.event_id).toBeDefined();
      expect(ev.event_name).toBeDefined();
      expect(ev.event_type).toBeDefined();
      expect(ev.status).toBeDefined();
    });

    it('supports pagination with custom page and limit', async () => {
      const res = await request(app).get('/api/v1/events?page=1&limit=2');

      expect(res.status).toBe(200);
      expect(res.body.data.events.length).toBe(2);
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.limit).toBe(2);
      expect(res.body.data.pagination.totalPages).toBeGreaterThanOrEqual(2);
    });

    it('filters events by category (event_type)', async () => {
      const res = await request(app).get('/api/v1/events?event_type=Robotics');

      expect(res.status).toBe(200);
      expect(res.body.data.events.length).toBe(1);
      expect(res.body.data.events[0].event_name).toContain('RoboSumo');
    });

    it('filters events by status (status=UPCOMING)', async () => {
      const res = await request(app).get('/api/v1/events?status=UPCOMING');

      expect(res.status).toBe(200);
      expect(res.body.data.events.length).toBeGreaterThanOrEqual(1);
      for (const ev of res.body.data.events) {
        expect(ev.status).toBe('UPCOMING');
      }
    });

    it('searches events by name keyword', async () => {
      const res = await request(app).get('/api/v1/events?search=Hackathon');

      expect(res.status).toBe(200);
      expect(res.body.data.events.length).toBe(1);
      expect(res.body.data.events[0].event_name).toContain('CodeCraft');
    });

    it('rejects invalid pagination parameters with 400 VALIDATION_ERROR', async () => {
      const res = await request(app).get('/api/v1/events?page=-1');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ==========================================
  // 2. Event Detail
  // ==========================================
  describe('2. Event Detail (GET /api/v1/events/:id)', () => {
    it('retrieves event details with associated coordinator and schedules', async () => {
      const res = await request(app).get('/api/v1/events/1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const event = res.body.data;
      expect(event.event_id).toBe(1);
      expect(event.event_name).toBe('CodeCraft 24h Hackathon');
      expect(event.coordinator_id).toBe(1);
      expect(event.coordinator_name).toBe('Prof. Shalu Mahajan');
      expect(Array.isArray(event.schedules)).toBe(true);
      expect(event.schedules.length).toBeGreaterThanOrEqual(1);
      expect(event.schedules[0].venue).toContain('Auditorium Hall B');
    });

    it('returns 404 NOT_FOUND for an unknown event ID', async () => {
      const res = await request(app).get('/api/v1/events/99999');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 400 VALIDATION_ERROR for an invalid event ID format', async () => {
      const res = await request(app).get('/api/v1/events/invalid-id');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ==========================================
  // 3. Event Creation
  // ==========================================
  describe('3. Event Creation (POST /api/v1/events)', () => {
    it('rejects unauthenticated requests with 401 AUTHENTICATION_FAILED', async () => {
      const res = await request(app).post('/api/v1/events').send({
        event_name: 'Unauthenticated Event',
        event_type: 'Workshop',
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTHENTICATION_FAILED');
    });

    it('rejects participant requests with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${participantToken}`)
        .send({
          event_name: 'Participant Event',
          event_type: 'Workshop',
          min_team_size: 1,
          max_team_size: 2,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects invalid event payload (min_team_size > max_team_size) with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          event_name: 'Inverted Size Event',
          event_type: 'Hackathon',
          min_team_size: 5,
          max_team_size: 2,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects unknown fields with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          event_name: 'Unknown Field Event',
          event_type: 'Hackathon',
          unrecognized_property: 'malicious_input',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('allows an authorized COORDINATOR to create an event', async () => {
      const uniqueName = `Web Dev Sprint ${Date.now()}`;
      const res = await request(app)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          event_name: uniqueName,
          event_type: 'Web Development',
          description: 'Build an accessible fullstack application in 4 hours.',
          min_team_size: 1,
          max_team_size: 3,
          registration_fee: 150,
          status: 'UPCOMING',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.event_name).toBe(uniqueName);
      expect(res.body.data.coordinator_id).toBe(1); // Auto-assigned to coordinator 1
      expect(res.body.data.min_team_size).toBe(1);
      expect(res.body.data.max_team_size).toBe(3);
    });

    it('forbids COORDINATOR from creating an event assigned to a different coordinator', async () => {
      const res = await request(app)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          event_name: 'Spoofed Coordinator Event',
          event_type: 'Web Development',
          coordinator_id: 99, // Attempt to spoof coordinator
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('allows an ADMIN to create an event with or without coordinator assignment', async () => {
      const uniqueName = `Admin Created Fest Event ${Date.now()}`;
      const res = await request(app)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          event_name: uniqueName,
          event_type: 'Keynote & Panel',
          description: 'Fest inaugural keynote and technical panel discussion.',
          min_team_size: 1,
          max_team_size: 1,
          registration_fee: 0,
          status: 'ACTIVE',
          coordinator_id: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.event_name).toBe(uniqueName);
      expect(res.body.data.coordinator_id).toBe(1);
    });
  });

  // ==========================================
  // 4. Event Updates
  // ==========================================
  describe('4. Event Updates (PATCH /api/v1/events/:id)', () => {
    it('returns 404 NOT_FOUND when updating a non-existent event', async () => {
      const res = await request(app)
        .patch('/api/v1/events/99999')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          event_name: 'Updated Nonexistent Event',
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('forbids PARTICIPANT from updating an event with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .patch('/api/v1/events/1')
        .set('Authorization', `Bearer ${participantToken}`)
        .send({
          event_name: 'Hacked Name',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('allows authorized COORDINATOR to update permitted fields on their event', async () => {
      const res = await request(app)
        .patch('/api/v1/events/1')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          description: 'Updated 24-hour flagship hackathon description for Phase 04 test.',
          status: 'ACTIVE',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.description).toContain('Phase 04 test');
      expect(res.body.data.status).toBe('ACTIVE');
    });

    it('rejects conflicting min_team_size > existing max_team_size with 400 VALIDATION_ERROR', async () => {
      // Event 1 has max_team_size = 4
      const res = await request(app)
        .patch('/api/v1/events/1')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          min_team_size: 10,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('forbids COORDINATOR from reassigning event coordinator_id with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .patch('/api/v1/events/1')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          coordinator_id: 99,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  // ==========================================
  // 5. Schedule Retrieval & Mutation
  // ==========================================
  describe('5. Schedule Management (/api/v1/events/:id/schedules)', () => {
    it('retrieves schedules for a valid event (GET /api/v1/events/:id/schedules)', async () => {
      const res = await request(app).get('/api/v1/events/1/schedules');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const schedule = res.body.data[0];
      expect(schedule.schedule_id).toBeDefined();
      expect(schedule.event_id).toBe(1);
      expect(schedule.event_date).toBeDefined();
      expect(schedule.start_time).toBeDefined();
      expect(schedule.end_time).toBeDefined();
      expect(schedule.venue).toBeDefined();
    });

    it('returns 404 NOT_FOUND for schedules of non-existent event', async () => {
      const res = await request(app).get('/api/v1/events/99999/schedules');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('rejects schedule creation with contradictory time (start_time >= end_time) with 400', async () => {
      const res = await request(app)
        .post('/api/v1/events/1/schedules')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          event_date: '2026-11-20',
          start_time: '18:00:00',
          end_time: '09:00:00', // start is later than end
          venue: 'Auditorium Hall B',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('forbids PARTICIPANT from creating a schedule entry with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .post('/api/v1/events/1/schedules')
        .set('Authorization', `Bearer ${participantToken}`)
        .send({
          event_date: '2026-11-20',
          start_time: '10:00:00',
          end_time: '12:00:00',
          venue: 'Room 101',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('allows authorized COORDINATOR to add a new schedule entry (POST /api/v1/events/:id/schedules)', async () => {
      const res = await request(app)
        .post('/api/v1/events/1/schedules')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          event_date: '2026-11-25',
          start_time: '14:00:00',
          end_time: '17:30:00',
          venue: 'Main Seminar Hall 3',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.schedule_id).toBeDefined();
      expect(res.body.data.event_id).toBe(1);
      expect(res.body.data.event_date).toBe('2026-11-25');
      expect(res.body.data.venue).toBe('Main Seminar Hall 3');
    });

    it('allows authorized COORDINATOR to update a schedule entry (PATCH /api/v1/events/:id/schedules/:scheduleId)', async () => {
      const res = await request(app)
        .patch('/api/v1/events/1/schedules/1')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          venue: 'Auditorium Hall B - Stage 1',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.venue).toBe('Auditorium Hall B - Stage 1');
    });

    it('returns 404 when updating non-existent schedule entry', async () => {
      const res = await request(app)
        .patch('/api/v1/events/1/schedules/99999')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          venue: 'New Venue',
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  // ==========================================
  // 6. Security & CSRF Defense-in-Depth
  // ==========================================
  describe('6. Security & CSRF Defense-in-Depth', () => {
    it('blocks cookie-authenticated event creation when CSRF token is missing with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .post('/api/v1/events')
        .set('Cookie', coordinatorCookie)
        .set('Origin', 'http://localhost:5173')
        .send({
          event_name: 'CSRF Exploit Attempt Event',
          event_type: 'Hacking',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('allows cookie-authenticated event creation with valid Double-Submit CSRF token and origin', async () => {
      const uniqueName = `CSRF Protected Event ${Date.now()}`;
      const res = await request(app)
        .post('/api/v1/events')
        .set('Cookie', coordinatorCookie)
        .set('Origin', 'http://localhost:5173')
        .set('X-CSRF-Token', coordinatorCsrfToken)
        .send({
          event_name: uniqueName,
          event_type: 'Cybersecurity',
          min_team_size: 1,
          max_team_size: 2,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.event_name).toBe(uniqueName);
    });
  });

  afterAll(async () => {
    const pool = getDbPool();
    await pool.query('DELETE FROM `schedule` WHERE `event_id` > 3');
    await pool.query('DELETE FROM `event` WHERE `event_id` > 3');
  });
});
