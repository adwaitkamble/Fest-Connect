import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import { getDbPool } from '../src/db/connection.js';
import { runMigrations } from '../src/db/migrate.js';
import { runSeeds } from '../src/db/seed.js';

describe('Phase 08 Verification Checks — Checks B, C, D Security & E2E Suite', () => {
  const app = createApp();
  let pool: mysql.Pool;

  let coordinator1Cookie: string[];
  let coordinator1Csrf: string;

  let coordinator2Cookie: string[];
  let coordinator2Csrf: string;

  let participantCookie: string[];
  let participantCsrf: string;
  let participantUserId: number;

  beforeAll(async () => {
    pool = getDbPool();
    await runMigrations({ silent: true });
    await runSeeds({ silent: true });

    // 1. Login Coordinator 1 (Assigned to Event 1)
    const coord1Res = await request(app).post('/api/v1/auth/login').send({
      email: 'coordinator@festconnect.edu',
      password: 'demo1234',
    });
    expect(coord1Res.status).toBe(200);
    coordinator1Cookie = coord1Res.headers['set-cookie'] || [];
    coordinator1Csrf = coord1Res.body.csrfToken;

    // 2. Insert and Login Coordinator 2 (Assigned to Event 2 or not assigned to Event 1)
    const coord2Hash = await bcrypt.hash('demo1234', 10);
    await pool.query('DELETE FROM event_coordinator WHERE email = ?', ['coordinator2@festconnect.edu']);
    await pool.query('DELETE FROM participant WHERE email = ?', ['coordinator2@festconnect.edu']);

    const [insertPart] = await pool.query<mysql.ResultSetHeader>(
      `INSERT INTO participant (first_name, last_name, email, password_hash, role, phone, college_name)
       VALUES ('Prof. Rajesh', 'Verma', 'coordinator2@festconnect.edu', ?, 'COORDINATOR', '+91 9876543299', 'UIT')`,
      [coord2Hash]
    );
    const coord2UserId = insertPart.insertId;

    await pool.query(
      `INSERT INTO event_coordinator (participant_id, name, email, phone)
       VALUES (?, 'Prof. Rajesh Verma', 'coordinator2@festconnect.edu', '+91 9876543299')`,
      [coord2UserId]
    );

    // Login Coordinator 2
    const coord2Res = await request(app).post('/api/v1/auth/login').send({
      email: 'coordinator2@festconnect.edu',
      password: 'demo1234',
    });
    expect(coord2Res.status).toBe(200);
    coordinator2Cookie = coord2Res.headers['set-cookie'] || [];
    coordinator2Csrf = coord2Res.body.csrfToken;

    // 3. Login Standard Participant (Adwait)
    const partRes = await request(app).post('/api/v1/auth/login').send({
      email: 'adwait@festconnect.edu',
      password: 'demo1234',
    });
    expect(partRes.status).toBe(200);
    participantCookie = partRes.headers['set-cookie'] || [];
    participantCsrf = partRes.body.csrfToken;
    participantUserId = partRes.body.user.participant_id;
  });

  // ========================================================
  // CHECK B: Backend Authorization Guards (Not Just React)
  // ========================================================
  describe('Check B — Strict Backend Authorization & Role Enforcement', () => {
    it('rejects participant attempting to create an event with HTTP 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/events')
        .set('Cookie', participantCookie)
        .set('X-CSRF-Token', participantCsrf)
        .send({
          event_name: 'Malicious Participant Event',
          event_type: 'Coding / Software',
          min_team_size: 1,
          max_team_size: 2,
          registration_fee: 0,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects participant attempting to update an event with HTTP 403 Forbidden', async () => {
      const res = await request(app)
        .patch('/api/v1/events/1')
        .set('Cookie', participantCookie)
        .set('X-CSRF-Token', participantCsrf)
        .send({
          event_name: 'Hacked Title',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects participant attempting to add an event schedule with HTTP 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/events/1/schedules')
        .set('Cookie', participantCookie)
        .set('X-CSRF-Token', participantCsrf)
        .send({
          event_date: '2026-11-20',
          start_time: '10:00:00',
          end_time: '12:00:00',
          venue: 'Unauthorized Venue',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects participant attempting to verify gate passes with HTTP 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/passes/verify')
        .set('Cookie', participantCookie)
        .set('X-CSRF-Token', participantCsrf)
        .send({
          pass_number: 'FEST-2026-CC1-001',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('blocks Coordinator 2 from modifying an event coordinated by Coordinator 1 with HTTP 403', async () => {
      const res = await request(app)
        .patch('/api/v1/events/1')
        .set('Cookie', coordinator2Cookie)
        .set('X-CSRF-Token', coordinator2Csrf)
        .send({
          event_name: 'Coordinator 2 Illegal Hijack',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain('not authorized to modify this event');
    });

    it('blocks Coordinator 2 from creating schedules for an event coordinated by Coordinator 1 with HTTP 403', async () => {
      const res = await request(app)
        .post('/api/v1/events/1/schedules')
        .set('Cookie', coordinator2Cookie)
        .set('X-CSRF-Token', coordinator2Csrf)
        .send({
          event_date: '2026-11-20',
          start_time: '10:00:00',
          end_time: '12:00:00',
          venue: 'Unauthorized Schedule Entry',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain('not authorized to create schedules for this event');
    });

    it('blocks Coordinator 2 from verifying passes for an event coordinated by Coordinator 1 with HTTP 403', async () => {
      const res = await request(app)
        .post('/api/v1/passes/verify')
        .set('Cookie', coordinator2Cookie)
        .set('X-CSRF-Token', coordinator2Csrf)
        .send({
          pass_number: 'FEST-2026-CC1-001',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain('not authorized to validate passes for an event you do not coordinate');
    });
  });

  // ========================================================
  // CHECK C: Full End-to-End Participant Workflow
  // ========================================================
  describe('Check C — Complete End-to-End Participant Journey', () => {
    const uniqueEmail = `e2e_student_${Date.now()}@festconnect.edu`;
    let userCookie: string[];
    let userCsrf: string;
    let createdTeamId: number;
    let createdRegId: number;
    let generatedPassNumber: string;
    let generatedPassId: number;

    it('Step 1: Register and sign in a fresh student account', async () => {
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          first_name: 'Tara',
          last_name: 'Bose',
          email: uniqueEmail,
          password: 'Password123!',
          phone: '+91 9876543288',
          college_name: 'Dept. of CS',
          skills: ['Node.js', 'React'],
        });

      expect(regRes.status).toBe(201);
      expect(regRes.body.user.email).toBe(uniqueEmail);
      expect(regRes.body.user.role).toBe('PARTICIPANT');

      userCookie = regRes.headers['set-cookie'] || [];
      userCsrf = regRes.body.csrfToken;
    });

    it('Step 2: Create a team with authenticated student as leader', async () => {
      const teamRes = await request(app)
        .post('/api/v1/teams')
        .set('Cookie', userCookie)
        .set('X-CSRF-Token', userCsrf)
        .send({
          team_name: `E2E Hack Squad ${Date.now()}`,
        });

      expect(teamRes.status).toBe(201);
      createdTeamId = teamRes.body.data.team_id;
      expect(teamRes.body.data.member_count).toBe(1);
    });

    it('Step 3: Add a team member to meet minimum team size of 2', async () => {
      const addRes = await request(app)
        .post(`/api/v1/teams/${createdTeamId}/members`)
        .set('Cookie', userCookie)
        .set('X-CSRF-Token', userCsrf)
        .send({
          email: 'shivam@festconnect.edu',
        });

      expect(addRes.status).toBe(201);
      expect(addRes.body.data.member_count).toBe(2);
    });

    it('Step 4: Register team for Event 1 (CodeCraft 24h Hackathon) -> PENDING_PAYMENT', async () => {
      const regRes = await request(app)
        .post('/api/v1/registrations')
        .set('Cookie', userCookie)
        .set('X-CSRF-Token', userCsrf)
        .send({
          team_id: createdTeamId,
          event_id: 1,
        });

      expect(regRes.status).toBe(201);
      createdRegId = regRes.body.data.registration_id;
      expect(regRes.body.data.status).toBe('PENDING_PAYMENT');
    });

    it('Step 5: Verify digital pass is NOT available before payment', async () => {
      const passRes = await request(app)
        .get(`/api/v1/registrations/${createdRegId}/pass`)
        .set('Cookie', userCookie);

      // Must reject pass retrieval for PENDING_PAYMENT with 404
      expect(passRes.status).toBe(404);
      expect(passRes.body.error.message).toContain('Digital pass is not available');
    });

    it('Step 6: Simulate FAILED mock payment -> registration remains PENDING_PAYMENT', async () => {
      const payRes = await request(app)
        .post(`/api/v1/registrations/${createdRegId}/payments`)
        .set('Cookie', userCookie)
        .set('X-CSRF-Token', userCsrf)
        .send({
          payment_method: 'MOCK',
          simulated_outcome: 'FAILED',
        });

      expect([200, 201]).toContain(payRes.status);
      expect(payRes.body.data.payment_status).toBe('FAILED');

      // Check registration status still PENDING_PAYMENT in DB
      const [regRows] = await pool.query<mysql.RowDataPacket[]>(
        'SELECT status FROM registration WHERE registration_id = ?',
        [createdRegId]
      );
      expect(regRows[0].status).toBe('PENDING_PAYMENT');
    });

    it('Step 7: Verify digital pass is STILL not available after failed payment', async () => {
      const passRes = await request(app)
        .get(`/api/v1/registrations/${createdRegId}/pass`)
        .set('Cookie', userCookie);

      expect(passRes.status).toBe(404);
    });

    it('Step 8: Complete SUCCESS mock payment -> registration transitions to CONFIRMED', async () => {
      const payRes = await request(app)
        .post(`/api/v1/registrations/${createdRegId}/payments`)
        .set('Cookie', userCookie)
        .set('X-CSRF-Token', userCsrf)
        .send({
          payment_method: 'MOCK',
          simulated_outcome: 'SUCCESS',
        });

      expect(payRes.status).toBe(201);
      expect(payRes.body.data.payment_status).toBe('SUCCESS');

      // Check registration status transitioned to CONFIRMED
      const [regRows] = await pool.query<mysql.RowDataPacket[]>(
        'SELECT status FROM registration WHERE registration_id = ?',
        [createdRegId]
      );
      expect(regRows[0].status).toBe('CONFIRMED');
    });

    it('Step 9: Retrieve unlocked digital pass and visual QR code data URL', async () => {
      const passRes = await request(app)
        .get(`/api/v1/registrations/${createdRegId}/pass`)
        .set('Cookie', userCookie);

      expect(passRes.status).toBe(200);
      expect(passRes.body.data.pass.pass_number).toBeDefined();
      expect(passRes.body.data.pass.registration_id).toBe(createdRegId);
      expect(passRes.body.data.qr_data_url).toContain('data:image/png;base64,');

      generatedPassNumber = passRes.body.data.pass.pass_number;
      generatedPassId = passRes.body.data.pass.pass_id;
    });

    it('Step 10: Retrieve pass directly via /api/v1/passes/:id', async () => {
      const passRes = await request(app)
        .get(`/api/v1/passes/${generatedPassId}`)
        .set('Cookie', userCookie);

      expect(passRes.status).toBe(200);
      expect(passRes.body.data.pass.pass_number).toBe(generatedPassNumber);
      expect(passRes.body.data.registration.registration_id).toBe(createdRegId);
    });

    it('Step 11: Inspect email notification delivery and verify duplicate cooldown / force resend', async () => {
      // 1. Verify pass generation automatically dispatched email notification
      const statusRes = await request(app)
        .get(`/api/v1/registrations/${createdRegId}/notifications/email`)
        .set('Cookie', userCookie);

      expect(statusRes.status).toBe(200);
      expect(statusRes.body.data.status).toBe('DELIVERED');
      expect(statusRes.body.data.recipient).toBe(uniqueEmail);
      expect(statusRes.body.data.attempts).toBe(1);

      // 2. Immediate POST without force should be rejected with 409 Conflict due to duplicate suppression cooldown
      const dupRes = await request(app)
        .post(`/api/v1/registrations/${createdRegId}/notifications/email`)
        .set('Cookie', userCookie)
        .set('X-CSRF-Token', userCsrf)
        .send();

      expect(dupRes.status).toBe(409);
      expect(dupRes.body.error.message).toContain('Duplicate notification suppressed');

      // 3. POST with force: true successfully bypasses duplicate cooldown for legitimate resend
      const forceRes = await request(app)
        .post(`/api/v1/registrations/${createdRegId}/notifications/email`)
        .set('Cookie', userCookie)
        .set('X-CSRF-Token', userCsrf)
        .send({ force: true });

      expect(forceRes.status).toBe(200);
      expect(forceRes.body.data.status).toBe('DELIVERED');
      expect(forceRes.body.data.attempts).toBe(2);
    });

    it('Step 12: Verify pass at gate by Coordinator 1 -> APPROVED', async () => {
      const verifyRes = await request(app)
        .post('/api/v1/passes/verify')
        .set('Cookie', coordinator1Cookie)
        .set('X-CSRF-Token', coordinator1Csrf)
        .send({
          pass_number: generatedPassNumber,
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.valid).toBe(true);
      expect(verifyRes.body.data.pass.pass_number).toBe(generatedPassNumber);
      expect(verifyRes.body.data.event.event_id).toBe(1);
      expect(verifyRes.body.data.members.length).toBe(2);
    });
  });

  // ========================================================
  // CHECK D: Data Correctness, Mapping & Tenant Isolation
  // ========================================================
  describe('Check D — Screen Mappings, Isolation & Permissions', () => {
    it('verifies /api/v1/registrations strictly isolates participant registrations to own teams', async () => {
      const listRes = await request(app)
        .get('/api/v1/registrations')
        .set('Cookie', participantCookie);

      expect(listRes.status).toBe(200);
      const regs = listRes.body.data.registrations;
      // All returned registrations must belong to a team where the authenticated participant is an enrolled member
      for (const r of regs) {
        const [member] = await pool.query<mysql.RowDataPacket[]>(
          'SELECT * FROM team_member WHERE team_id = ? AND participant_id = ?',
          [r.team_id, participantUserId]
        );
        expect(member.length).toBeGreaterThan(0);
      }
    });

    it('verifies /api/v1/teams strictly isolates participant teams to own teams', async () => {
      const teamsRes = await request(app)
        .get('/api/v1/teams')
        .set('Cookie', participantCookie);

      expect(teamsRes.status).toBe(200);
      const teams = teamsRes.body.data;
      for (const t of teams) {
        const [member] = await pool.query<mysql.RowDataPacket[]>(
          'SELECT * FROM team_member WHERE team_id = ? AND participant_id = ?',
          [t.team_id, participantUserId]
        );
        expect(member.length).toBeGreaterThan(0);
      }
    });

    it('verifies /api/v1/registrations for Coordinator 1 returns only registrations for Event 1', async () => {
      const listRes = await request(app)
        .get('/api/v1/registrations')
        .set('Cookie', coordinator1Cookie);

      expect(listRes.status).toBe(200);
      const regs = listRes.body.data.registrations;
      for (const r of regs) {
        expect(r.event_id).toBe(1);
      }
    });

    it('rejects participant trying to inspect another team with HTTP 403 Forbidden', async () => {
      // Find a team the participant is not in
      const [teams] = await pool.query<mysql.RowDataPacket[]>(
        'SELECT team_id FROM team WHERE team_id NOT IN (SELECT team_id FROM team_member WHERE participant_id = ?) LIMIT 1',
        [participantUserId]
      );

      if (teams.length > 0) {
        const otherTeamId = teams[0].team_id;
        const res = await request(app)
          .get(`/api/v1/teams/${otherTeamId}`)
          .set('Cookie', participantCookie);

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('FORBIDDEN');
      }
    });
  });
});
