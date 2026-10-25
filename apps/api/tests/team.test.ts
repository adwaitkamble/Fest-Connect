import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { getDbPool } from '../src/db/connection.js';
import { runSeeds } from '../src/db/seed.js';

describe('Phase 05 — Team & Registration Management Integration Suite', () => {
  const app = createApp();

  let adminCookie: string[];
  let adminCsrfToken: string;

  let coordCookie: string[];
  let coordCsrfToken: string;

  let leaderCookie: string[];
  let leaderCsrfToken: string;
  let leaderId: number;

  let memberCookie: string[];
  let memberCsrfToken: string;
  let memberId: number;

  let outsiderCookie: string[];
  let outsiderCsrfToken: string;
  let outsiderId: number;

  async function cleanupTestData() {
    const pool = getDbPool();
    await pool.query('DELETE FROM `pass_receipt` WHERE `registration_id` > 1');
    await pool.query('DELETE FROM `payment` WHERE `registration_id` > 1');
    await pool.query('DELETE FROM `registration` WHERE `registration_id` > 1');
    await pool.query('DELETE FROM `team_member` WHERE `team_id` > 1');
    await pool.query('DELETE FROM `team` WHERE `team_id` > 1');
    await pool.query('DELETE FROM `schedule` WHERE `event_id` > 3');
    await pool.query('DELETE FROM `event` WHERE `event_id` > 3');
    await pool.query('DELETE FROM `participant_skill` WHERE `participant_id` > 5');
    await pool.query('DELETE FROM `participant` WHERE `participant_id` > 5');
    await runSeeds();
  }

  beforeAll(async () => {
    await cleanupTestData();

    // 1. Admin login (admin@festconnect.edu / demo1234)
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@festconnect.edu', password: 'demo1234' });
    adminCookie = adminLogin.headers['set-cookie'] || [];
    adminCsrfToken = adminLogin.body.csrfToken;

    // 2. Coordinator login (coordinator@festconnect.edu / demo1234)
    const coordLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'coordinator@festconnect.edu', password: 'demo1234' });
    coordCookie = coordLogin.headers['set-cookie'] || [];
    coordCsrfToken = coordLogin.body.csrfToken;

    // 3. Team leader login (adwait@festconnect.edu / demo1234)
    const leaderLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'adwait@festconnect.edu', password: 'demo1234' });
    leaderCookie = leaderLogin.headers['set-cookie'] || [];
    leaderCsrfToken = leaderLogin.body.csrfToken;
    leaderId = leaderLogin.body.user.participant_id;

    // 4. Member participant login (shivam@festconnect.edu / demo1234)
    const memberLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'shivam@festconnect.edu', password: 'demo1234' });
    memberCookie = memberLogin.headers['set-cookie'] || [];
    memberCsrfToken = memberLogin.body.csrfToken;
    memberId = memberLogin.body.user.participant_id;

    // 5. Outsider participant register + login (fresh account)
    const timestamp = Date.now();
    const outsiderEmail = `outsider_${timestamp}@festconnect.edu`;
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: outsiderEmail,
        password: 'Password123!',
        first_name: 'Outsider',
        last_name: 'Tester',
        college_name: 'Fest Tech Institute',
        phone: '9876543299',
      });
    outsiderCookie = regRes.headers['set-cookie'] || [];
    outsiderCsrfToken = regRes.body.csrfToken;
    outsiderId = regRes.body.user.participant_id;
  });

  // ==========================================
  // 1. Team Creation & Invariant Enforcement
  // ==========================================
  describe('1. Team Creation (POST /api/v1/teams)', () => {
    it('creates a new team with authenticated user as canonical leader and adds LEADER member record', async () => {
      const res = await request(app)
        .post('/api/v1/teams')
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken)
        .send({ team_name: 'CyberDefenders Gamma' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.team_name).toBe('CyberDefenders Gamma');
      expect(res.body.data.leader_id).toBe(leaderId);
      expect(res.body.data.status).toBe('FORMING');
      expect(res.body.data.member_count).toBe(1);

      // Verify members array contains leader with role LEADER
      const members = res.body.data.members;
      expect(members.length).toBe(1);
      expect(members[0].participant_id).toBe(leaderId);
      expect(members[0].role).toBe('LEADER');
    });

    it('rejects team creation without CSRF token with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .post('/api/v1/teams')
        .set('Cookie', leaderCookie)
        .send({ team_name: 'No CSRF Team' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects unauthenticated team creation with 401 AUTHENTICATION_FAILED', async () => {
      const res = await request(app)
        .post('/api/v1/teams')
        .send({ team_name: 'Unauth Team' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTHENTICATION_FAILED');
    });

    it('rejects team creation with invalid name (empty string) with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/v1/teams')
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken)
        .send({ team_name: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ==========================================
  // 2. Team Listing & Privacy Access Control
  // ==========================================
  describe('2. Team Retrieval & Privacy (GET /api/v1/teams & /:id)', () => {
    let createdTeamId: number;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/v1/teams')
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken)
        .send({ team_name: 'Privacy Audit Team' });
      createdTeamId = res.body.data.team_id;
    });

    it('allows team leader to retrieve team details by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/teams/${createdTeamId}`)
        .set('Cookie', leaderCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.team_id).toBe(createdTeamId);
      expect(res.body.data.team_name).toBe('Privacy Audit Team');
    });

    it('allows administrator to view any team details', async () => {
      const res = await request(app)
        .get(`/api/v1/teams/${createdTeamId}`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.team_id).toBe(createdTeamId);
    });

    it('denies outsider participant from accessing private team details with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get(`/api/v1/teams/${createdTeamId}`)
        .set('Cookie', outsiderCookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 404 NOT_FOUND for non-existent team ID', async () => {
      const res = await request(app)
        .get('/api/v1/teams/999999')
        .set('Cookie', leaderCookie);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('lists only teams the participant is a member of for participant role', async () => {
      const res = await request(app)
        .get('/api/v1/teams')
        .set('Cookie', outsiderCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      // The outsider is not part of Privacy Audit Team or seeded Team 1
      for (const t of res.body.data) {
        expect(t.team_id).not.toBe(createdTeamId);
      }
    });

    it('lists all teams for administrator', async () => {
      const res = await request(app)
        .get('/api/v1/teams')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ==========================================
  // 3. Team Member Management
  // ==========================================
  describe('3. Team Member Management (POST / DELETE /api/v1/teams/:id/members)', () => {
    let testTeamId: number;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/v1/teams')
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken)
        .send({ team_name: 'Roster Management Unit' });
      testTeamId = res.body.data.team_id;
    });

    it('allows team leader to add member by participant_id', async () => {
      const res = await request(app)
        .post(`/api/v1/teams/${testTeamId}/members`)
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken)
        .send({ participant_id: memberId });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.member_count).toBe(2);
      const added = res.body.data.members.find((m: any) => m.participant_id === memberId);
      expect(added).toBeDefined();
      expect(added.role).toBe('MEMBER');
    });

    it('rejects adding the same member again with 409 CONFLICT', async () => {
      const res = await request(app)
        .post(`/api/v1/teams/${testTeamId}/members`)
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken)
        .send({ participant_id: memberId });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
      expect(res.body.error.message).toContain('already a member');
    });

    it('allows team leader to add member by email', async () => {
      // Add outsider participant by their email
      const res = await request(app)
        .post(`/api/v1/teams/${testTeamId}/members`)
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken)
        .send({ email: 'nikhil@festconnect.edu' });

      expect(res.status).toBe(201);
      expect(res.body.data.member_count).toBe(3);
    });

    it('rejects adding non-existent participant with 404 NOT_FOUND', async () => {
      const res = await request(app)
        .post(`/api/v1/teams/${testTeamId}/members`)
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken)
        .send({ email: 'ghost_nonexistent@festconnect.edu' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('denies non-leader participant from adding members with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .post(`/api/v1/teams/${testTeamId}/members`)
        .set('Cookie', memberCookie)
        .set('x-csrf-token', memberCsrfToken)
        .send({ email: 'coordinator@festconnect.edu' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects removing the canonical team leader with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .delete(`/api/v1/teams/${testTeamId}/members/${leaderId}`)
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('canonical team leader cannot be removed');
    });

    it('denies outsider from removing team members with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .delete(`/api/v1/teams/${testTeamId}/members/${memberId}`)
        .set('Cookie', outsiderCookie)
        .set('x-csrf-token', outsiderCsrfToken);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('allows team leader to remove a member', async () => {
      const res = await request(app)
        .delete(`/api/v1/teams/${testTeamId}/members/${memberId}`)
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify member is gone
      const detail = await request(app)
        .get(`/api/v1/teams/${testTeamId}`)
        .set('Cookie', leaderCookie);
      expect(detail.body.data.member_count).toBe(2);
      expect(detail.body.data.members.some((m: any) => m.participant_id === memberId)).toBe(false);
    });

    it('allows a member to remove themselves (leave team)', async () => {
      // Re-add memberId first
      await request(app)
        .post(`/api/v1/teams/${testTeamId}/members`)
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken)
        .send({ participant_id: memberId });

      // Member self-removes
      const res = await request(app)
        .delete(`/api/v1/teams/${testTeamId}/members/${memberId}`)
        .set('Cookie', memberCookie)
        .set('x-csrf-token', memberCsrfToken);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==========================================
  // 4. Event Registration & Constraints
  // ==========================================
  describe('4. Event Registration (POST /api/v1/registrations)', () => {
    let regTeamId: number;

    beforeAll(async () => {
      // Create team for registration tests
      const res = await request(app)
        .post('/api/v1/teams')
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken)
        .send({ team_name: 'Reg Execution Team' });
      regTeamId = res.body.data.team_id;

      // Add memberId so team has 2 members
      await request(app)
        .post(`/api/v1/teams/${regTeamId}/members`)
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken)
        .send({ participant_id: memberId });
    });

    it('rejects registration with invalid team size (under min_team_size)', async () => {
      // Create a solo team (1 member)
      const soloRes = await request(app)
        .post('/api/v1/teams')
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken)
        .send({ team_name: 'Solo Ineligible Team' });
      const soloTeamId = soloRes.body.data.team_id;

      // Event 1 (CodeCraft 24h Hackathon) requires min_team_size = 2
      const regRes = await request(app)
        .post('/api/v1/registrations')
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken)
        .send({ team_id: soloTeamId, event_id: 1 });

      expect(regRes.status).toBe(400);
      expect(regRes.body.error.code).toBe('VALIDATION_ERROR');
      expect(regRes.body.error.message).toContain('at least 2 members');
    });

    it('rejects registration with invalid team size (over max_team_size)', async () => {
      // Event 3 (AlgoSprint) has max_team_size = 1. regTeamId has 2 members.
      const maxRes = await request(app)
        .post('/api/v1/registrations')
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken)
        .send({ team_id: regTeamId, event_id: 3 });

      expect(maxRes.status).toBe(400);
      expect(maxRes.body.error.code).toBe('VALIDATION_ERROR');
      expect(maxRes.body.error.message).toContain('allows at most 1 members');
    });

    it('rejects registration by non-leader participant with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .post('/api/v1/registrations')
        .set('Cookie', memberCookie)
        .set('x-csrf-token', memberCsrfToken)
        .send({ team_id: regTeamId, event_id: 2 });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('successfully registers an eligible team with status PENDING_PAYMENT and transitions team to REGISTERED', async () => {
      // Event 2 (RoboSumo): min_team_size = 1, max_team_size = 3. regTeam has 2 members.
      const res = await request(app)
        .post('/api/v1/registrations')
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken)
        .send({ team_id: regTeamId, event_id: 2 });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.registration_id).toBeDefined();
      expect(res.body.data.team_id).toBe(regTeamId);
      expect(res.body.data.event_id).toBe(2);
      expect(res.body.data.status).toBe('PENDING_PAYMENT');
      expect(res.body.data.event_name).toContain('RoboSumo');

      // Verify team status transitioned to REGISTERED
      const teamRes = await request(app)
        .get(`/api/v1/teams/${regTeamId}`)
        .set('Cookie', leaderCookie);
      expect(teamRes.body.data.status).toBe('REGISTERED');
    });

    it('rejects duplicate registration for the same team and event with 409 CONFLICT', async () => {
      const res = await request(app)
        .post('/api/v1/registrations')
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken)
        .send({ team_id: regTeamId, event_id: 2 });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
      expect(res.body.error.message).toContain('already registered');
    });

    it('detects schedule conflict across team members and rejects registration with 409 CONFLICT', async () => {
      // 1. Coordinator creates a new event
      const overlapEventRes = await request(app)
        .post('/api/v1/events')
        .set('Cookie', coordCookie)
        .set('x-csrf-token', coordCsrfToken)
        .send({
          event_name: 'Overlapping Drone Combat',
          event_type: 'Autonomous Systems',
          description: 'Autonomous indoor drone competition.',
          min_team_size: 1,
          max_team_size: 2,
          registration_fee: 150.00,
        });
      expect(overlapEventRes.status).toBe(201);
      const overlapEventId = overlapEventRes.body.data.event_id;

      // Add overlapping schedule to this event on 2026-11-16 (12:00 - 15:00, overlapping with RoboSumo 10:00 - 16:00)
      const scheduleRes = await request(app)
        .post(`/api/v1/events/${overlapEventId}/schedules`)
        .set('Cookie', coordCookie)
        .set('x-csrf-token', coordCsrfToken)
        .send({
          event_date: '2026-11-16',
          start_time: '12:00:00',
          end_time: '15:00:00',
          venue: 'Indoor Sports Complex',
        });
      expect(scheduleRes.status).toBe(201);

      // 2. MemberId (who is enrolled in regTeam, which is registered for RoboSumo on 2026-11-16 10:00 - 16:00) creates conflictTeam
      const conflictTeamRes = await request(app)
        .post('/api/v1/teams')
        .set('Cookie', memberCookie)
        .set('x-csrf-token', memberCsrfToken)
        .send({ team_name: 'Conflict Attempt Team' });
      const conflictTeamId = conflictTeamRes.body.data.team_id;

      // 3. conflictTeam attempts to register for the overlapping Drone Combat event
      const regAttempt = await request(app)
        .post('/api/v1/registrations')
        .set('Cookie', memberCookie)
        .set('x-csrf-token', memberCsrfToken)
        .send({ team_id: conflictTeamId, event_id: overlapEventId });

      expect(regAttempt.status).toBe(409);
      expect(regAttempt.body.error.code).toBe('CONFLICT');
      expect(regAttempt.body.error.message).toContain('Schedule conflict detected');
      expect(regAttempt.body.error.message).toContain('RoboSumo');
    });
  });

  // ==========================================
  // 5. Registration Retrieval & Cancellation
  // ==========================================
  describe('5. Registration Retrieval & Lifecycle (GET & PATCH /api/v1/registrations)', () => {
    let targetRegId: number;

    beforeAll(async () => {
      // Get registrations for leader
      const listRes = await request(app)
        .get('/api/v1/registrations')
        .set('Cookie', leaderCookie);
      expect(listRes.status).toBe(200);
      expect(listRes.body.data.registrations.length).toBeGreaterThanOrEqual(1);
      targetRegId = listRes.body.data.registrations[0].registration_id;
    });

    it('allows participant to retrieve their registration details', async () => {
      const res = await request(app)
        .get(`/api/v1/registrations/${targetRegId}`)
        .set('Cookie', leaderCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.registration_id).toBe(targetRegId);
    });

    it('denies outsider participant from accessing private registration details with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get(`/api/v1/registrations/${targetRegId}`)
        .set('Cookie', outsiderCookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('allows administrator to access any registration details', async () => {
      const res = await request(app)
        .get(`/api/v1/registrations/${targetRegId}`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.registration_id).toBe(targetRegId);
    });

    it('allows team leader to cancel registration via PATCH /api/v1/registrations/:id', async () => {
      // Find a registration that belongs to leader and is not already cancelled
      const res = await request(app)
        .patch(`/api/v1/registrations/${targetRegId}`)
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken)
        .send({ status: 'CANCELLED' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('CANCELLED');
    });

    it('rejects cancellation attempt by unauthorized participant with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .patch(`/api/v1/registrations/${targetRegId}`)
        .set('Cookie', outsiderCookie)
        .set('x-csrf-token', outsiderCsrfToken)
        .send({ status: 'CANCELLED' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects invalid patch body (e.g. attempting to mark CONFIRMED) with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .patch(`/api/v1/registrations/${targetRegId}`)
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken)
        .send({ status: 'CONFIRMED' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  afterAll(async () => {
    await cleanupTestData();
  });
});
