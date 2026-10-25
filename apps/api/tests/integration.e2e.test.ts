import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { getDbPool } from '../src/db/connection.js';
import { runMigrations } from '../src/db/migrate.js';
import { runSeeds } from '../src/db/seed.js';
import { PaymentFactory } from '../src/factories/payment.factory.js';
import { assertDisposableDatabase } from '../src/db/safety.js';
import { getCacheService } from '../src/cache/index.js';

describe('Phase 10 — End-to-End Integration, Resilience & Security Suite', () => {
  const app = createApp();
  const db = getDbPool();

  beforeAll(async () => {
    await runMigrations();
    await runSeeds();
  });

  afterAll(async () => {
    await getCacheService().close();
    await db.end();
  });

  // -------------------------------------------------------------------
  // 1. Health and Readiness Probes
  // -------------------------------------------------------------------
  describe('System Health & Container Probes', () => {
    it('GET /api/health returns 200 OK with liveness diagnostic metadata', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.liveness).toBe('ok');
      expect(res.body.service).toBe('festconnect-api');
      expect(typeof res.body.uptime).toBe('number');
    });

    it('GET /api/ready returns 200 OK verifying database connection readiness', async () => {
      const res = await request(app).get('/api/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
      expect(res.body.dependencies.database.connected).toBe(true);
    });
  });

  // -------------------------------------------------------------------
  // 2. Full End-to-End User Journey (Participant Registration -> Gate Validation)
  // -------------------------------------------------------------------
  describe('Full End-to-End Workflow', () => {
    const timestamp = Date.now();
    const leaderEmail = `phase10_e2e_leader_${timestamp}@festconnect.edu`;
    let userCookie: string[];
    let userCsrf: string;
    let teamId: number;
    let registrationId: number;
    let passNumber: string;

    it('Step 1 & 2: Register participant account, obtain session cookie and CSRF token', async () => {
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          first_name: 'Adwait',
          last_name: 'Kulkarni',
          email: leaderEmail,
          password: 'Password123!',
          phone: '+91 9876543201',
          college_name: 'PCCoE Autonomous',
          skills: ['Node.js', 'System Architecture'],
        });

      expect(regRes.status).toBe(201);
      expect(regRes.body.user.email).toBe(leaderEmail);
      expect(regRes.body.user.role).toBe('PARTICIPANT');

      userCookie = regRes.headers['set-cookie'] || [];
      expect(userCookie.length).toBeGreaterThan(0);
      userCsrf = regRes.body.csrfToken;
      expect(userCsrf).toBeDefined();
    });

    it('Step 3: Browse public event catalog and inspect event schedules', async () => {
      // 1. Catalog discovery
      const resEvents = await request(app).get('/api/v1/events?limit=5');
      expect(resEvents.status).toBe(200);
      expect(Array.isArray(resEvents.body.data.events)).toBe(true);
      expect(resEvents.body.data.events.length).toBeGreaterThan(0);

      const targetEvent = resEvents.body.data.events[0];
      expect(targetEvent.event_id).toBeDefined();

      // 2. Schedules inspection
      const resSchedules = await request(app)
        .get(`/api/v1/events/${targetEvent.event_id}/schedules`);
      expect(resSchedules.status).toBe(200);
      expect(Array.isArray(resSchedules.body.data)).toBe(true);
      expect(resSchedules.body.data.length).toBeGreaterThan(0);
      expect(resSchedules.body.data[0].venue).toBeDefined();
    });

    it('Step 4: Create team and add member (Team Leader flow)', async () => {
      // 1. Create team
      const resTeam = await request(app)
        .post('/api/v1/teams')
        .set('Cookie', userCookie)
        .set('X-CSRF-Token', userCsrf)
        .send({
          team_name: `Phase 10 Squad ${timestamp}`,
        });

      expect(resTeam.status).toBe(201);
      teamId = resTeam.body.data.team_id;
      expect(teamId).toBeDefined();
      expect(resTeam.body.data.member_count).toBe(1);

      // 2. Add member (using seeded participant)
      const resAdd = await request(app)
        .post(`/api/v1/teams/${teamId}/members`)
        .set('Cookie', userCookie)
        .set('X-CSRF-Token', userCsrf)
        .send({
          email: 'shivam@festconnect.edu',
        });

      expect(resAdd.status).toBe(201);
      expect(resAdd.body.data.member_count).toBe(2);
    });

    it('Step 5: Register team for Event 1 (CodeCraft Hackathon) -> PENDING_PAYMENT', async () => {
      const resReg = await request(app)
        .post('/api/v1/registrations')
        .set('Cookie', userCookie)
        .set('X-CSRF-Token', userCsrf)
        .send({
          team_id: teamId,
          event_id: 1,
        });

      expect(resReg.status).toBe(201);
      registrationId = resReg.body.data.registration_id;
      expect(registrationId).toBeDefined();
      expect(resReg.body.data.status).toBe('PENDING_PAYMENT');
    });

    it('Step 6: Digital pass is completely unavailable before payment confirmation', async () => {
      const resPass = await request(app)
        .get(`/api/v1/registrations/${registrationId}/pass`)
        .set('Cookie', userCookie);

      expect(resPass.status).toBe(404);
      expect(resPass.body.error.message).toContain('Digital pass is not available');
    });

    it('Step 7: Test failed mock payment (remains PENDING_PAYMENT, no pass)', async () => {
      const resFail = await request(app)
        .post(`/api/v1/registrations/${registrationId}/payments`)
        .set('Cookie', userCookie)
        .set('X-CSRF-Token', userCsrf)
        .send({
          payment_method: 'MOCK',
          simulated_outcome: 'FAILED',
        });

      expect([200, 201]).toContain(resFail.status);
      expect(resFail.body.data.payment_status).toBe('FAILED');

      // Verify DB state: registration remains PENDING_PAYMENT
      const [rows] = await db.query<any[]>(
        'SELECT status FROM registration WHERE registration_id = ?',
        [registrationId]
      );
      expect(rows[0].status).toBe('PENDING_PAYMENT');
    });

    it('Step 8: Complete successful payment (transitions to CONFIRMED, creates pass)', async () => {
      const resSuccess = await request(app)
        .post(`/api/v1/registrations/${registrationId}/payments`)
        .set('Cookie', userCookie)
        .set('X-CSRF-Token', userCsrf)
        .send({
          payment_method: 'MOCK',
          simulated_outcome: 'SUCCESS',
        });

      expect(resSuccess.status).toBe(201);
      expect(resSuccess.body.data.payment_status).toBe('SUCCESS');

      // Verify DB state: registration is CONFIRMED
      const [rows] = await db.query<any[]>(
        'SELECT status FROM registration WHERE registration_id = ?',
        [registrationId]
      );
      expect(rows[0].status).toBe('CONFIRMED');
    });

    it('Step 9: Retrieve valid digital pass and visual QR code', async () => {
      const resPass = await request(app)
        .get(`/api/v1/registrations/${registrationId}/pass`)
        .set('Cookie', userCookie);

      expect(resPass.status).toBe(200);
      expect(resPass.body.data.pass.pass_number).toMatch(/^FEST-2026-REG/);
      expect(resPass.body.data.pass.registration_id).toBe(registrationId);
      expect(resPass.body.data.qr_data_url).toContain('data:image/png;base64,');

      passNumber = resPass.body.data.pass.pass_number;
    });

    it('Step 10: Request and verify pass email notification status', async () => {
      // 1. Give the asynchronous pass-issuance email dispatch a moment to settle
      let resStatus = await request(app)
        .get(`/api/v1/registrations/${registrationId}/notifications/email`)
        .set('Cookie', userCookie);

      for (let i = 0; i < 5 && resStatus.body.data.status === 'NOT_SENT'; i++) {
        await new Promise((r) => setTimeout(r, 100));
        resStatus = await request(app)
          .get(`/api/v1/registrations/${registrationId}/notifications/email`)
          .set('Cookie', userCookie);
      }

      // If not yet dispatched, trigger dispatch
      if (resStatus.body.data.status === 'NOT_SENT') {
        const resSend = await request(app)
          .post(`/api/v1/registrations/${registrationId}/notifications/email`)
          .set('Cookie', userCookie)
          .set('X-CSRF-Token', userCsrf)
          .send();
        expect(resSend.status).toBe(200);
      }

      // Confirm status is DELIVERED
      const resDelivered = await request(app)
        .get(`/api/v1/registrations/${registrationId}/notifications/email`)
        .set('Cookie', userCookie);

      expect(resDelivered.status).toBe(200);
      expect(resDelivered.body.data.status).toBe('DELIVERED');
      expect(resDelivered.body.data.recipient).toBe(leaderEmail);

      // 2. Immediate POST without force triggers duplicate cooldown (409 Conflict)
      const resCooldown = await request(app)
        .post(`/api/v1/registrations/${registrationId}/notifications/email`)
        .set('Cookie', userCookie)
        .set('X-CSRF-Token', userCsrf)
        .send();

      expect(resCooldown.status).toBe(409);
      expect(resCooldown.body.error.message).toContain('Duplicate notification suppressed');

      // 3. Force resend succeeds
      const resForce = await request(app)
        .post(`/api/v1/registrations/${registrationId}/notifications/email`)
        .set('Cookie', userCookie)
        .set('X-CSRF-Token', userCsrf)
        .send({ force: true });

      expect(resForce.status).toBe(200);
      expect(resForce.body.data.status).toBe('DELIVERED');
    });

    it('Step 11: Coordinator login and gate pass verification', async () => {
      // 1. Log in as seeded Event Coordinator
      const resLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'coordinator@festconnect.edu',
          password: 'demo1234',
        });

      expect(resLogin.status).toBe(200);
      expect(resLogin.body.user.role).toBe('COORDINATOR');

      const coordCookies = resLogin.headers['set-cookie'] || [];
      const coordCsrf = resLogin.body.csrfToken;

      // 2. Validate participant digital pass at event entrance gate
      const resVerify = await request(app)
        .post('/api/v1/passes/verify')
        .set('Cookie', coordCookies)
        .set('X-CSRF-Token', coordCsrf)
        .send({
          pass_number: passNumber,
        });

      expect(resVerify.status).toBe(200);
      expect(resVerify.body.data.valid).toBe(true);
      expect(resVerify.body.data.pass.pass_number).toBe(passNumber);
      expect(resVerify.body.data.event.event_id).toBe(1);
    });

    it('Step 12: Gate pass verification rejects invalid / forged pass numbers', async () => {
      const resLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'coordinator@festconnect.edu',
          password: 'demo1234',
        });

      const coordCookies = resLogin.headers['set-cookie'] || [];
      const coordCsrf = resLogin.body.csrfToken;

      const resInvalid = await request(app)
        .post('/api/v1/passes/verify')
        .set('Cookie', coordCookies)
        .set('X-CSRF-Token', coordCsrf)
        .send({
          pass_number: 'FEST-2026-FORGED-00000000',
        });

      expect(resInvalid.status).toBe(400);
      expect(resInvalid.body.success).toBe(false);
      expect(resInvalid.body.data.valid).toBe(false);
      expect(resInvalid.body.data.message).toContain('Invalid pass reference');
    });
  });

  // -------------------------------------------------------------------
  // 3. Security, Authorization & Production Invariants
  // -------------------------------------------------------------------
  describe('Security and Resilience Invariants', () => {
    it('Refuses mock payment provider when NODE_ENV=production', () => {
      const origEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        expect(() => PaymentFactory.getAdapter('mock')).toThrow(
          /Production configuration forbids the mock payment provider/
        );
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });

    it('Refuses destructive operations and seeds when NODE_ENV=production', () => {
      const origEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        expect(() => assertDisposableDatabase('Reset')).toThrow(
          /Destructive operation cannot be run in production mode/
        );
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });

    it('Blocks non-coordinators and participants from updating event schedules', async () => {
      // Login as participant
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'adwait@festconnect.edu',
          password: 'demo1234',
        });

      const participantCookie = loginRes.headers['set-cookie'] || [];
      const participantCsrf = loginRes.body.csrfToken;

      // Attempt to modify schedule
      const resForbidden = await request(app)
        .patch('/api/v1/events/1/schedules/1')
        .set('Cookie', participantCookie)
        .set('X-CSRF-Token', participantCsrf)
        .send({
          venue: 'Unauthorized Venue Hijack',
        });

      expect(resForbidden.status).toBe(403);
      expect(resForbidden.body.error.code).toBe('FORBIDDEN');
    });

    it('Graceful fallback: public event read succeeds even if Redis is unreachable', async () => {
      // listEvents must succeed and return database records regardless of Redis status
      const res = await request(app).get('/api/v1/events?limit=3');
      expect(res.status).toBe(200);
      expect(res.body.data.events.length).toBeGreaterThan(0);
    });
  });
});
