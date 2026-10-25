import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import mysql from 'mysql2/promise';
import crypto from 'crypto';
import { createApp } from '../src/app.js';
import { getDbPool } from '../src/db/connection.js';
import { runMigrations } from '../src/db/migrate.js';
import { runSeeds } from '../src/db/seed.js';
import { consoleEmailAdapter } from '../src/adapters/email/console-email.adapter.js';
import { GmailSmtpAdapter } from '../src/adapters/email/gmail-smtp.adapter.js';
import { EmailFactory } from '../src/factories/email.factory.js';
import { passService } from '../src/services/pass.service.js';
import { scheduleService } from '../src/services/schedule.service.js';
import { NotificationService } from '../src/services/notification.service.js';
import { ScheduleObserver, ScheduleChangeEvent } from '../src/types/observer.types.js';

describe('Phase 07 — Digital Passes, Observer & Notifications Suite', () => {
  const app = createApp();
  let pool: mysql.Pool;

  // Demo user cookies and CSRF tokens
  let adminCookie: string[];
  let adminCsrfToken: string;

  let coordinatorCookie: string[];
  let coordinatorCsrfToken: string;

  let coord2Cookie: string[];
  let coord2CsrfToken: string;

  let leaderCookie: string[];
  let leaderCsrfToken: string;

  let memberCookie: string[];
  let memberCsrfToken: string;

  let otherCookie: string[];
  let otherCsrfToken: string;

  beforeAll(async () => {
    pool = getDbPool();
    await runMigrations({ silent: true });
    await runSeeds({ silent: true });

    // 1. Login Admin
    const adminRes = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@festconnect.edu',
      password: 'demo1234',
    });
    adminCookie = adminRes.headers['set-cookie'] || [];
    adminCsrfToken = adminRes.body.csrfToken;

    // 2. Login Coordinator 1 (assigned to Event 1)
    const coordRes = await request(app).post('/api/v1/auth/login').send({
      email: 'coordinator@festconnect.edu',
      password: 'demo1234',
    });
    coordinatorCookie = coordRes.headers['set-cookie'] || [];
    coordinatorCsrfToken = coordRes.body.csrfToken;

    // 3. Register, promote and login Coordinator 2 (assigned to Event 2 only)
    await request(app).post('/api/v1/auth/register').send({
      first_name: 'Coordinator',
      last_name: 'Two',
      email: 'coord2@festconnect.edu',
      password: 'password123',
    });
    const [c2User] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT participant_id FROM participant WHERE email = 'coord2@festconnect.edu'"
    );
    const c2ParticipantId = c2User[0].participant_id;
    await pool.query("UPDATE participant SET role = 'COORDINATOR' WHERE participant_id = ?", [c2ParticipantId]);
    await pool.query(
      "INSERT INTO event_coordinator (coordinator_id, participant_id, name, email, phone) VALUES (2, ?, 'Prof. Event Two Coordinator', 'coord2@festconnect.edu', '9876543299') ON DUPLICATE KEY UPDATE coordinator_id = 2",
      [c2ParticipantId]
    );
    await pool.query("UPDATE event SET coordinator_id = 2 WHERE event_id = 2");

    const coord2Res = await request(app).post('/api/v1/auth/login').send({
      email: 'coord2@festconnect.edu',
      password: 'password123',
    });
    coord2Cookie = coord2Res.headers['set-cookie'] || [];
    coord2CsrfToken = coord2Res.body.csrfToken;

    // 4. Login Team 1 Leader (Adwait)
    const leaderRes = await request(app).post('/api/v1/auth/login').send({
      email: 'adwait@festconnect.edu',
      password: 'demo1234',
    });
    leaderCookie = leaderRes.headers['set-cookie'] || [];
    leaderCsrfToken = leaderRes.body.csrfToken;

    // 5. Login Team 1 Member (Shivam)
    const memberRes = await request(app).post('/api/v1/auth/login').send({
      email: 'shivam@festconnect.edu',
      password: 'demo1234',
    });
    memberCookie = memberRes.headers['set-cookie'] || [];
    memberCsrfToken = memberRes.body.csrfToken;

    // 6. Register and login another participant (not in Team 1)
    await request(app).post('/api/v1/auth/register').send({
      first_name: 'Unrelated',
      last_name: 'Participant',
      email: 'unrelated.pass.user@festconnect.edu',
      password: 'password123',
    });
    const otherRes = await request(app).post('/api/v1/auth/login').send({
      email: 'unrelated.pass.user@festconnect.edu',
      password: 'password123',
    });
    otherCookie = otherRes.headers['set-cookie'] || [];
    otherCsrfToken = otherRes.body.csrfToken;

    await cleanupTestData();
  }, 30000);

  async function cleanupTestData() {
    await pool.query('DELETE FROM `email_notification_attempt`');
    await pool.query('DELETE FROM `email_notification`');
    await pool.query('DELETE FROM `pass_receipt` WHERE `pass_id` > 1');
    await pool.query('DELETE FROM `payment` WHERE `payment_id` > 2');
    await pool.query('DELETE FROM `registration` WHERE `registration_id` > 1');
    await pool.query('DELETE FROM `team_member` WHERE `team_id` > 1');
    await pool.query('DELETE FROM `team` WHERE `team_id` > 1');
  }

  beforeEach(async () => {
    consoleEmailAdapter.clearSentEmails();
    await cleanupTestData();
  });

  describe('1. Digital Pass Generation & Entitlement Rules', () => {
    it('retrieves the existing seeded digital pass for Registration 1 (CONFIRMED + verified payment)', async () => {
      const res = await request(app)
        .get('/api/v1/registrations/1/pass')
        .set('Cookie', leaderCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();

      const passData = res.body.data;
      expect(passData.pass.registration_id).toBe(1);
      expect(passData.pass.payment_id).toBe(2);
      expect(passData.pass.pass_number).toBe('FEST-2026-CC1-001');
      expect(passData.qr_data_url).toMatch(/^data:image\/png;base64,/);
      expect(passData.registration.team_name).toBe('CodeCrafters Alpha');
      expect(passData.registration.event_name).toBe('CodeCraft 24h Hackathon');
      expect(passData.payment.payment_status).toBe('SUCCESS');
      expect(passData.members.length).toBeGreaterThanOrEqual(1);
    });

    it('generates a pass on-demand for a CONFIRMED registration with verified payment if not yet created', async () => {
      // Create a new team and confirmed registration with verified payment directly for testing
      const [teamRes] = await pool.query<mysql.ResultSetHeader>(
        "INSERT INTO `team` (`team_name`, `leader_id`, `status`) VALUES ('Pass Gen Test Team', 3, 'REGISTERED')"
      );
      const teamId = teamRes.insertId;

      await pool.query(
        "INSERT INTO `team_member` (`team_id`, `participant_id`, `role`) VALUES (?, 3, 'LEADER')",
        [teamId]
      );

      const [regRes] = await pool.query<mysql.ResultSetHeader>(
        "INSERT INTO `registration` (`team_id`, `event_id`, `status`) VALUES (?, 1, 'CONFIRMED')",
        [teamId]
      );
      const regId = regRes.insertId;

      const dynamicTxn = `TXN-PASS-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
      const [payRes] = await pool.query<mysql.ResultSetHeader>(
        "INSERT INTO `payment` (`registration_id`, `attempt_number`, `amount`, `payment_status`, `payment_method`, `transaction_id`) VALUES (?, 1, 400.00, 'SUCCESS', 'MOCK', ?)",
        [regId, dynamicTxn]
      );
      const payId = payRes.insertId;

      // Now generate pass via POST /api/v1/registrations/:id/pass
      const genRes = await request(app)
        .post(`/api/v1/registrations/${regId}/pass`)
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken);

      expect(genRes.status).toBe(201);
      expect(genRes.body.success).toBe(true);
      expect(genRes.body.data.pass.registration_id).toBe(regId);
      expect(genRes.body.data.pass.payment_id).toBe(payId);
      expect(genRes.body.data.pass.pass_number).toMatch(/^FEST-2026-REG/);
      expect(genRes.body.data.qr_data_url).toMatch(/^data:image\/png;base64,/);

      // Verify pass delivery email was triggered
      const sentEmails = consoleEmailAdapter.getSentEmails();
      expect(sentEmails.length).toBeGreaterThanOrEqual(1);
      const passEmail = sentEmails.find((e) => e.payload.subject.includes(genRes.body.data.pass.pass_number));
      expect(passEmail).toBeDefined();
      expect(passEmail?.payload.to).toBe('adwait@festconnect.edu');
    });

    it('rejects pass generation for a PENDING_PAYMENT registration', async () => {
      // Create a PENDING_PAYMENT registration
      const [teamRes] = await pool.query<mysql.ResultSetHeader>(
        "INSERT INTO `team` (`team_name`, `leader_id`, `status`) VALUES ('Pending Pass Team', 3, 'REGISTERED')"
      );
      const teamId = teamRes.insertId;
      await pool.query("INSERT INTO `team_member` (`team_id`, `participant_id`, `role`) VALUES (?, 3, 'LEADER')", [teamId]);

      const [regRes] = await pool.query<mysql.ResultSetHeader>(
        "INSERT INTO `registration` (`team_id`, `event_id`, `status`) VALUES (?, 2, 'PENDING_PAYMENT')",
        [teamId]
      );
      const pendingRegId = regRes.insertId;

      const res = await request(app)
        .get(`/api/v1/registrations/${pendingRegId}/pass`)
        .set('Cookie', leaderCookie);

      expect(res.status).toBe(404);
      expect(res.body.error.message).toContain('Pass requires CONFIRMED status');
    });

    it('rejects pass generation for a CANCELLED registration', async () => {
      // Create a CANCELLED registration
      const [teamRes] = await pool.query<mysql.ResultSetHeader>(
        "INSERT INTO `team` (`team_name`, `leader_id`, `status`) VALUES ('Cancelled Pass Team', 3, 'REGISTERED')"
      );
      const teamId = teamRes.insertId;
      await pool.query("INSERT INTO `team_member` (`team_id`, `participant_id`, `role`) VALUES (?, 3, 'LEADER')", [teamId]);

      const [regRes] = await pool.query<mysql.ResultSetHeader>(
        "INSERT INTO `registration` (`team_id`, `event_id`, `status`) VALUES (?, 2, 'CANCELLED')",
        [teamId]
      );
      const cancelledRegId = regRes.insertId;

      const res = await request(app)
        .post(`/api/v1/registrations/${cancelledRegId}/pass`)
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken);

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('CANCELLED');
    });

    it('rejects pass generation if registration is CONFIRMED but has NO verified SUCCESS payment', async () => {
      // Abnormal scenario: confirmed but only FAILED payment
      const [teamRes] = await pool.query<mysql.ResultSetHeader>(
        "INSERT INTO `team` (`team_name`, `leader_id`, `status`) VALUES ('No Pay Pass Team', 3, 'REGISTERED')"
      );
      const teamId = teamRes.insertId;
      await pool.query("INSERT INTO `team_member` (`team_id`, `participant_id`, `role`) VALUES (?, 3, 'LEADER')", [teamId]);

      const [regRes] = await pool.query<mysql.ResultSetHeader>(
        "INSERT INTO `registration` (`team_id`, `event_id`, `status`) VALUES (?, 3, 'CONFIRMED')",
        [teamId]
      );
      const noPayRegId = regRes.insertId;

      const dynamicFailTxn = `TXN-FAIL-NOPASS-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
      await pool.query(
        "INSERT INTO `payment` (`registration_id`, `attempt_number`, `amount`, `payment_status`, `payment_method`, `transaction_id`) VALUES (?, 1, 100.00, 'FAILED', 'MOCK', ?)",
        [noPayRegId, dynamicFailTxn]
      );

      const res = await request(app)
        .post(`/api/v1/registrations/${noPayRegId}/pass`)
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken);

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('SUCCESS payment record');
    });

    it('enforces idempotency: repeated pass generation returns existing pass without duplicating database rows', async () => {
      const [firstPassCount] = await pool.query<mysql.RowDataPacket[]>('SELECT COUNT(*) as count FROM pass_receipt');

      // Request 1
      const res1 = await request(app)
        .get('/api/v1/registrations/1/pass')
        .set('Cookie', leaderCookie);
      expect(res1.status).toBe(200);

      // Request 2 (POST generation endpoint)
      const res2 = await request(app)
        .post('/api/v1/registrations/1/pass')
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken);
      expect(res2.status).toBe(201);
      expect(res2.body.data.pass.pass_number).toBe(res1.body.data.pass.pass_number);

      const [secondPassCount] = await pool.query<mysql.RowDataPacket[]>('SELECT COUNT(*) as count FROM pass_receipt');
      expect(secondPassCount[0].count).toBe(firstPassCount[0].count);
    });

    it('database constraint uk_pass_registration physically rejects duplicate passes in MySQL', async () => {
      let duplicateError: { code?: string } | null = null;
      try {
        await pool.query(
          "INSERT INTO `pass_receipt` (`registration_id`, `payment_id`, `pass_number`, `qr_code`) VALUES (1, 2, 'DUP-PASS-1', 'DUP-QR')"
        );
      } catch (err: unknown) {
        duplicateError = err as { code?: string };
      }

      expect(duplicateError).not.toBeNull();
      expect(duplicateError?.code).toBe('ER_DUP_ENTRY');
    });
  });

  describe('2. Authorization and Security Boundaries', () => {
    it('rejects unauthenticated pass access', async () => {
      const res = await request(app).get('/api/v1/registrations/1/pass');
      expect(res.status).toBe(401);
    });

    it('allows a team member (not just leader) to view their team pass', async () => {
      const res = await request(app)
        .get('/api/v1/registrations/1/pass')
        .set('Cookie', memberCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.pass.registration_id).toBe(1);
    });

    it('rejects another team participant from accessing Team 1 pass', async () => {
      const res = await request(app)
        .get('/api/v1/registrations/1/pass')
        .set('Cookie', otherCookie);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Access denied');
    });

    it('allows event coordinator to view any pass for their event', async () => {
      const res = await request(app)
        .get('/api/v1/registrations/1/pass')
        .set('Cookie', coordinatorCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.pass.pass_number).toBe('FEST-2026-CC1-001');
    });

    it('allows administrator to retrieve pass by pass ID via GET /api/v1/passes/:id', async () => {
      const res = await request(app)
        .get('/api/v1/passes/1')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.pass.pass_id).toBe(1);
    });

    it('returns 404 when pass ID does not exist', async () => {
      const res = await request(app)
        .get('/api/v1/passes/999999')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(404);
    });
  });

  describe('3. Pass Verification Endpoint (POST /api/v1/passes/verify)', () => {
    it('verifies an authentic digital pass by pass_number', async () => {
      const res = await request(app)
        .post('/api/v1/passes/verify')
        .set('Cookie', coordinatorCookie)
        .set('x-csrf-token', coordinatorCsrfToken)
        .send({
          pass_number: 'FEST-2026-CC1-001',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.valid).toBe(true);
      expect(res.body.data.pass.pass_number).toBe('FEST-2026-CC1-001');
      expect(res.body.data.event.event_name).toBe('CodeCraft 24h Hackathon');
      expect(res.body.data.team.team_name).toBe('CodeCrafters Alpha');
      expect(res.body.data.members.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.verified_at).toBeDefined();
    });

    it('verifies an authentic digital pass by qr_code token', async () => {
      const res = await request(app)
        .post('/api/v1/passes/verify')
        .set('Cookie', coordinatorCookie)
        .set('x-csrf-token', coordinatorCsrfToken)
        .send({
          qr_code: 'FESTCONNECT::PASS::REG1::EVENT1::TEAM1::PAY2::SIG789ABC',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.valid).toBe(true);
      expect(res.body.data.team.team_name).toBe('CodeCrafters Alpha');
    });

    it('rejects an invalid or non-existent pass number with valid: false (HTTP 400)', async () => {
      const res = await request(app)
        .post('/api/v1/passes/verify')
        .set('Cookie', coordinatorCookie)
        .set('x-csrf-token', coordinatorCsrfToken)
        .send({
          pass_number: 'FEST-NONEXISTENT-999',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.data.valid).toBe(false);
      expect(res.body.data.message).toContain('Invalid pass reference');
    });

    it('rejects fabricated QR token with forged signature (HTTP 400)', async () => {
      // Generate a legitimate token first
      const legitimateToken = passService.generateQrToken(1, 1, 1, 2, 'FEST-2026-CC1-001');

      // Tamper with the signature portion
      const tamperedToken = legitimateToken.slice(0, -4) + 'DEAD';

      const res = await request(app)
        .post('/api/v1/passes/verify')
        .set('Cookie', coordinatorCookie)
        .set('x-csrf-token', coordinatorCsrfToken)
        .send({
          qr_code: tamperedToken,
        });

      expect(res.status).toBe(400);
      expect(res.body.data.valid).toBe(false);
    });

    it('rejects empty verification request (HTTP 400 validation error)', async () => {
      const res = await request(app)
        .post('/api/v1/passes/verify')
        .set('Cookie', coordinatorCookie)
        .set('x-csrf-token', coordinatorCsrfToken)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('4. Email Notification Service & Adapters', () => {
    it('ConsoleEmailAdapter prints preview and stores sent record in test environment', async () => {
      consoleEmailAdapter.clearSentEmails();

      const result = await consoleEmailAdapter.sendEmail({
        to: 'student@festconnect.edu',
        subject: 'Test Email Subject',
        text: 'Hello, this is a test email message content.',
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('console');
      expect(result.recipientCount).toBe(1);

      const sent = consoleEmailAdapter.getSentEmails();
      expect(sent.length).toBe(1);
      expect(sent[0].payload.to).toBe('student@festconnect.edu');
      expect(sent[0].payload.subject).toBe('Test Email Subject');
    });

    it('GmailSmtpAdapter fails safely without unhandled crashes when credentials are absent', async () => {
      const unconfiguredAdapter = new GmailSmtpAdapter();
      const result = await unconfiguredAdapter.sendEmail({
        to: 'recipient@test.com',
        subject: 'Unconfigured Test',
        text: 'This should fail safely.',
      });

      expect(result.success).toBe(false);
      expect(result.provider).toBe('gmail');
      expect(result.error).toContain('missing or incomplete');
    });

    it('EmailFactory returns configured console adapter by default', () => {
      const adapter = EmailFactory.getAdapter();
      expect(adapter.name).toBe('console');
    });
  });

  describe('5. Observer Pattern — Schedule Change Notifications', () => {
    it('ScheduleService registers observers and notifies them upon schedule update', async () => {
      let observerCalled = false;
      let observedEvent: ScheduleChangeEvent | null = null;

      const mockObserver: ScheduleObserver = {
        name: 'TestScheduleObserver',
        async onScheduleChanged(event: ScheduleChangeEvent): Promise<void> {
          observerCalled = true;
          observedEvent = event;
        },
      };

      scheduleService.addObserver(mockObserver);
      expect(scheduleService.getObservers().some((o) => o.name === 'TestScheduleObserver')).toBe(true);

      // Trigger a schedule update on Event 1 (Schedule 1)
      const res = await request(app)
        .patch('/api/v1/events/1/schedules/1')
        .set('Cookie', coordinatorCookie)
        .set('x-csrf-token', coordinatorCsrfToken)
        .send({
          venue: 'Auditorium Hall B (Updated for Observer Test)',
          start_time: '10:00:00',
          end_time: '17:00:00',
        });

      expect(res.status).toBe(200);

      // Allow background microtask / promise to settle
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(observerCalled).toBe(true);
      expect(observedEvent).toBeDefined();
      expect(observedEvent?.eventId).toBe(1);
      expect(observedEvent?.updatedSchedule.venue).toBe('Auditorium Hall B (Updated for Observer Test)');

      // Verify emailNotificationObserver dispatched an email to confirmed participants
      const sentEmails = consoleEmailAdapter.getSentEmails();
      const scheduleEmail = sentEmails.find((e) => e.payload.subject.includes('Schedule Update'));
      expect(scheduleEmail).toBeDefined();

      // Clean up mock observer
      scheduleService.removeObserver('TestScheduleObserver');
      expect(scheduleService.getObservers().some((o) => o.name === 'TestScheduleObserver')).toBe(false);
    });

    it('Schedule update succeeds cleanly even if an observer throws an error', async () => {
      const faultyObserver: ScheduleObserver = {
        name: 'FaultyObserver',
        async onScheduleChanged(): Promise<void> {
          throw new Error('Simulated observer failure');
        },
      };

      scheduleService.addObserver(faultyObserver);

      const res = await request(app)
        .patch('/api/v1/events/1/schedules/1')
        .set('Cookie', coordinatorCookie)
        .set('x-csrf-token', coordinatorCsrfToken)
        .send({
          venue: 'Auditorium Main Stage',
        });

      // API update must succeed and not be rolled back by observer failure
      expect(res.status).toBe(200);
      expect(res.body.data.venue).toBe('Auditorium Main Stage');

      scheduleService.removeObserver('FaultyObserver');
    });
  });

  describe('6. Server-Side Pass Token Validation (POST /api/v1/passes/validate)', () => {
    it('validates authentic pass by pass_number via /api/v1/passes/validate', async () => {
      const res = await request(app)
        .post('/api/v1/passes/validate')
        .set('Cookie', coordinatorCookie)
        .set('x-csrf-token', coordinatorCsrfToken)
        .send({
          pass_number: 'FEST-2026-CC1-001',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.valid).toBe(true);
      expect(res.body.data.pass.pass_number).toBe('FEST-2026-CC1-001');
      expect(res.body.data.event.event_name).toBe('CodeCraft 24h Hackathon');
    });

    it('validates authentic pass by qr_code via /api/v1/passes/validate', async () => {
      const res = await request(app)
        .post('/api/v1/passes/validate')
        .set('Cookie', coordinatorCookie)
        .set('x-csrf-token', coordinatorCsrfToken)
        .send({
          qr_code: 'FESTCONNECT::PASS::REG1::EVENT1::TEAM1::PAY2::SIG789ABC',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.valid).toBe(true);
    });

    it('validates authentic pass by pass_token via /api/v1/passes/validate', async () => {
      const res = await request(app)
        .post('/api/v1/passes/validate')
        .set('Cookie', coordinatorCookie)
        .set('x-csrf-token', coordinatorCsrfToken)
        .send({
          pass_token: 'FESTCONNECT::PASS::REG1::EVENT1::TEAM1::PAY2::SIG789ABC',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.valid).toBe(true);
    });

    it('rejects an invalid or non-existent pass token with HTTP 400 and valid: false', async () => {
      const res = await request(app)
        .post('/api/v1/passes/validate')
        .set('Cookie', coordinatorCookie)
        .set('x-csrf-token', coordinatorCsrfToken)
        .send({
          pass_token: 'FESTCONNECT::PASS::NONEXISTENT::TOKEN::123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.data.valid).toBe(false);
    });

    it('rejects a forged or tampered HMAC signature token', async () => {
      const forgedToken = 'FESTCONNECT::PASS::REG1::EVENT1::TEAM1::PAY2::SIGFORGED999999';
      const res = await request(app)
        .post('/api/v1/passes/validate')
        .set('Cookie', coordinatorCookie)
        .set('x-csrf-token', coordinatorCsrfToken)
        .send({
          qr_code: forgedToken,
        });

      expect(res.status).toBe(400);
      expect(res.body.data.valid).toBe(false);
    });
  });

  describe('7. Email Notification Delivery Status & Retry Protection', () => {
    it('retrieves email notification status for an authorized user (GET /api/v1/registrations/:id/notifications/email)', async () => {
      const res = await request(app)
        .get('/api/v1/registrations/1/notifications/email')
        .set('Cookie', leaderCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.registration_id).toBe(1);
      expect(res.body.data.recipient).toBe('adwait@festconnect.edu');
      expect(['DELIVERED', 'NOT_SENT']).toContain(res.body.data.status);
    });

    it('rejects unauthorized participant from viewing another team email notification status', async () => {
      const res = await request(app)
        .get('/api/v1/registrations/1/notifications/email')
        .set('Cookie', otherCookie);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Access denied');
    });

    it('rejects unauthenticated notification status check with HTTP 401', async () => {
      const res = await request(app).get('/api/v1/registrations/1/notifications/email');
      expect(res.status).toBe(401);
    });

    it('requests email notification dispatch for confirmed registration with verified pass', async () => {
      const res = await request(app)
        .post('/api/v1/registrations/1/notifications/email')
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken)
        .send({ force: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('DELIVERED');
      expect(res.body.data.recipient).toBe('adwait@festconnect.edu');
      expect(res.body.data.attempts).toBeGreaterThanOrEqual(1);
    });

    it('enforces duplicate-send protection when requesting another email immediately without force', async () => {
      // First ensure an email is recorded
      await request(app)
        .post('/api/v1/registrations/1/notifications/email')
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken)
        .send({ force: true });

      // Immediate repeated send without force flag should be suppressed by duplicate protection
      const dupRes = await request(app)
        .post('/api/v1/registrations/1/notifications/email')
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken)
        .send({});

      expect(dupRes.status).toBe(409);
      expect(dupRes.body.error.message).toContain('Duplicate notification suppressed');
    });

    it('allows explicit retry with force: true and increments attempt count', async () => {
      // Initial send
      await request(app)
        .post('/api/v1/registrations/1/notifications/email')
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken)
        .send({ force: true });

      const retryRes = await request(app)
        .post('/api/v1/registrations/1/notifications/email')
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken)
        .send({ force: true });

      expect(retryRes.status).toBe(200);
      expect(retryRes.body.data.status).toBe('DELIVERED');
      expect(retryRes.body.data.attempts).toBeGreaterThanOrEqual(2);
    });

    it('rejects email notification request for PENDING_PAYMENT registration', async () => {
      // Create pending registration
      const [teamRes] = await pool.query<mysql.ResultSetHeader>(
        "INSERT INTO `team` (`team_name`, `leader_id`, `status`) VALUES ('Email Pending Team', 3, 'REGISTERED')"
      );
      const teamId = teamRes.insertId;
      await pool.query("INSERT INTO `team_member` (`team_id`, `participant_id`, `role`) VALUES (?, 3, 'LEADER')", [teamId]);

      const [regRes] = await pool.query<mysql.ResultSetHeader>(
        "INSERT INTO `registration` (`team_id`, `event_id`, `status`) VALUES (?, 2, 'PENDING_PAYMENT')",
        [teamId]
      );
      const pendingRegId = regRes.insertId;

      const res = await request(app)
        .post(`/api/v1/registrations/${pendingRegId}/notifications/email`)
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('pending payment');
    });

    it('rejects email notification request for CANCELLED registration', async () => {
      // Create cancelled registration
      const [teamRes] = await pool.query<mysql.ResultSetHeader>(
        "INSERT INTO `team` (`team_name`, `leader_id`, `status`) VALUES ('Email Cancelled Team', 3, 'REGISTERED')"
      );
      const teamId = teamRes.insertId;
      await pool.query("INSERT INTO `team_member` (`team_id`, `participant_id`, `role`) VALUES (?, 3, 'LEADER')", [teamId]);

      const [regRes] = await pool.query<mysql.ResultSetHeader>(
        "INSERT INTO `registration` (`team_id`, `event_id`, `status`) VALUES (?, 2, 'CANCELLED')",
        [teamId]
      );
      const cancelledRegId = regRes.insertId;

      const res = await request(app)
        .post(`/api/v1/registrations/${cancelledRegId}/notifications/email`)
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('cancelled');
    });

    it('persists notification status, attempts, and audit trail in MySQL across service restarts', async () => {
      // Send an email
      await request(app)
        .post('/api/v1/registrations/1/notifications/email')
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken)
        .send({ force: true });

      // Verify MySQL summary table directly
      const [summaryRows] = await pool.query<mysql.RowDataPacket[]>(
        'SELECT * FROM `email_notification` WHERE `registration_id` = 1'
      );
      expect(summaryRows.length).toBe(1);
      expect(summaryRows[0].status).toBe('DELIVERED');
      expect(summaryRows[0].recipient_email).toBe('adwait@festconnect.edu');
      expect(summaryRows[0].attempts).toBeGreaterThanOrEqual(1);

      // Verify MySQL attempt audit table directly
      const [attemptRows] = await pool.query<mysql.RowDataPacket[]>(
        'SELECT * FROM `email_notification_attempt` WHERE `registration_id` = 1 ORDER BY `attempt_number` ASC'
      );
      expect(attemptRows.length).toBeGreaterThanOrEqual(1);
      expect(attemptRows[attemptRows.length - 1].status).toBe('DELIVERED');

      // Simulate restart: construct fresh NotificationService instance
      const restartedService = new NotificationService();
      const status = await restartedService.getNotificationStatus(1, {
        userId: 3,
        email: 'adwait@festconnect.edu',
        role: 'PARTICIPANT',
        name: 'Adwait',
      });

      expect(status.status).toBe('DELIVERED');
      expect(status.recipient).toBe('adwait@festconnect.edu');
      expect(status.attempts).toBe(summaryRows[0].attempts);
    });

    it('safely handles concurrent retry requests with MySQL row locking without corruption', async () => {
      // Ensure initial record exists
      await request(app)
        .post('/api/v1/registrations/1/notifications/email')
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken)
        .send({ force: true });

      // Fire 5 concurrent retry requests with force: true
      const promises = Array.from({ length: 5 }).map(() =>
        request(app)
          .post('/api/v1/registrations/1/notifications/email')
          .set('Cookie', leaderCookie)
          .set('x-csrf-token', leaderCsrfToken)
          .send({ force: true })
      );

      const responses = await Promise.all(promises);
      for (const res of responses) {
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('DELIVERED');
      }

      // Verify in MySQL that attempts counter and audit rows are properly incremented
      const [summaryRows] = await pool.query<mysql.RowDataPacket[]>(
        'SELECT `attempts` FROM `email_notification` WHERE `registration_id` = 1'
      );
      expect(summaryRows[0].attempts).toBeGreaterThanOrEqual(5);

      const [attemptRows] = await pool.query<mysql.RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM `email_notification_attempt` WHERE `registration_id` = 1'
      );
      expect(attemptRows[0].count).toBeGreaterThanOrEqual(5);
    });

    it('records FAILED status on provider failure and recovers to DELIVERED on subsequent retry', async () => {
      // Create failing EmailService
      const failingEmailService = {
        async sendPassDeliveryEmail(): Promise<any> {
          throw new Error('SMTP connection timed out: 554 Mailbox unavailable');
        },
        async sendScheduleChangeEmail(): Promise<any> {
          throw new Error('SMTP connection timed out');
        },
        clearSentEmails(): void {},
        getSentEmails(): any[] { return []; },
      } as any;

      const testNotificationService = new NotificationService(failingEmailService);
      const authUser = {
        userId: 3,
        email: 'adwait@festconnect.edu',
        role: 'PARTICIPANT' as const,
        name: 'Adwait',
      };

      // Dispatch failing notification
      const failResult = await testNotificationService.sendOrRetryNotification(1, authUser, { force: true });
      expect(failResult.status).toBe('FAILED');
      expect(failResult.error).toContain('SMTP connection timed out');

      // Check MySQL persistence for FAILED state
      const [failRows] = await pool.query<mysql.RowDataPacket[]>(
        'SELECT `status`, `last_error` FROM `email_notification` WHERE `registration_id` = 1'
      );
      expect(failRows[0].status).toBe('FAILED');
      expect(failRows[0].last_error).toContain('SMTP connection timed out');

      // Now retry with working service
      const recoveringService = new NotificationService();
      const recoveredResult = await recoveringService.sendOrRetryNotification(1, authUser, { force: true });
      expect(recoveredResult.status).toBe('DELIVERED');
      expect(recoveredResult.error).toBeFalsy();

      // Check MySQL persistence for recovery
      const [recoveredRows] = await pool.query<mysql.RowDataPacket[]>(
        'SELECT `status`, `last_error` FROM `email_notification` WHERE `registration_id` = 1'
      );
      expect(recoveredRows[0].status).toBe('DELIVERED');
      expect(recoveredRows[0].last_error).toBeNull();
    });
  });

  // ============================================================================
  // 8. Cryptographic QR Forgery & Multi-Event Resource Authorization Gates
  // ============================================================================
  describe('8. Cryptographic QR Forgery & Multi-Event Resource Authorization Gates', () => {
    it('generates authentic full HMAC-SHA256 signature QR token that validates successfully', async () => {
      const generatedToken = passService.generateQrToken(1, 1, 1, 2, 'FEST-2026-CC1-001');
      expect(generatedToken).toMatch(/^FESTCONNECT::PASS::REG1::EVENT1::TEAM1::PAY2::SIG[A-F0-9]{64}$/);

      const isValid = passService.verifyQrTokenSignature(generatedToken, 'FEST-2026-CC1-001');
      expect(isValid).toBe(true);

      const res = await request(app)
        .post('/api/v1/passes/validate')
        .set('Cookie', coordinatorCookie)
        .set('x-csrf-token', coordinatorCsrfToken)
        .send({ qr_code: generatedToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.valid).toBe(true);
    });

    it('rejects forged QR token signed with an untrusted or altered secret key', async () => {
      const fakeSecret = 'malicious_attacker_untrusted_secret_key_12345';
      const payload = '1:1:1:2:FEST-2026-CC1-001';
      const fakeSig = crypto.createHmac('sha256', fakeSecret).update(payload).digest('hex').toUpperCase();
      const forgedToken = `FESTCONNECT::PASS::REG1::EVENT1::TEAM1::PAY2::SIG${fakeSig}`;

      const isValid = passService.verifyQrTokenSignature(forgedToken, 'FEST-2026-CC1-001');
      expect(isValid).toBe(false);

      const res = await request(app)
        .post('/api/v1/passes/validate')
        .set('Cookie', coordinatorCookie)
        .set('x-csrf-token', coordinatorCsrfToken)
        .send({ qr_code: forgedToken });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.data.valid).toBe(false);
    });

    it('rejects tampered QR token where registration ID or payment ID is altered in payload', async () => {
      // Valid signature for REG1:PAY2
      const authenticToken = passService.generateQrToken(1, 1, 1, 2, 'FEST-2026-CC1-001');
      // Tamper registration ID from REG1 to REG999 while keeping signature
      const tamperedToken = authenticToken.replace('REG1', 'REG999');

      const isValid = passService.verifyQrTokenSignature(tamperedToken, 'FEST-2026-CC1-001');
      expect(isValid).toBe(false);

      const res = await request(app)
        .post('/api/v1/passes/validate')
        .set('Cookie', coordinatorCookie)
        .set('x-csrf-token', coordinatorCsrfToken)
        .send({ qr_code: tamperedToken });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.data.valid).toBe(false);
    });

    it('rejects participant from invoking pass verification gate check with HTTP 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/passes/validate')
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken)
        .send({ pass_number: 'FEST-2026-CC1-001' });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Only event coordinators and administrators');
    });

    it('rejects coordinator from verifying a pass for an event they do not coordinate with HTTP 403 Forbidden', async () => {
      // Coordinator 2 coordinates Event 2; pass is for Event 1
      const res = await request(app)
        .post('/api/v1/passes/validate')
        .set('Cookie', coord2Cookie)
        .set('x-csrf-token', coord2CsrfToken)
        .send({ pass_number: 'FEST-2026-CC1-001' });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('not authorized to validate passes for an event you do not coordinate');
    });

    it('rejects coordinator from retrieving pass details for an event they do not coordinate with HTTP 403 Forbidden', async () => {
      // Registration 1 belongs to Event 1, coordinated by Coordinator 1, NOT Coordinator 2
      const res = await request(app)
        .get('/api/v1/registrations/1/pass')
        .set('Cookie', coord2Cookie);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('not authorized to view passes for an event you do not coordinate');
    });

    it('rejects coordinator from generating a pass for an event they do not coordinate with HTTP 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/registrations/1/pass')
        .set('Cookie', coord2Cookie)
        .set('x-csrf-token', coord2CsrfToken);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('not authorized to generate passes for an event you do not coordinate');
    });

    it('rejects coordinator from retrieving email notification status for an event they do not coordinate with HTTP 403', async () => {
      const res = await request(app)
        .get('/api/v1/registrations/1/notifications/email')
        .set('Cookie', coord2Cookie);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('not authorized to view or manage notifications');
    });

    it('rejects coordinator from retrying email notification for an event they do not coordinate with HTTP 403', async () => {
      const res = await request(app)
        .post('/api/v1/registrations/1/notifications/email')
        .set('Cookie', coord2Cookie)
        .set('x-csrf-token', coord2CsrfToken)
        .send({ force: true });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('not authorized to view or manage notifications');
    });

    it('allows assigned coordinator to retrieve and validate pass for their own assigned event', async () => {
      // Coordinator 1 coordinates Event 1
      const getRes = await request(app)
        .get('/api/v1/registrations/1/pass')
        .set('Cookie', coordinatorCookie);

      expect(getRes.status).toBe(200);
      expect(getRes.body.success).toBe(true);

      const valRes = await request(app)
        .post('/api/v1/passes/validate')
        .set('Cookie', coordinatorCookie)
        .set('x-csrf-token', coordinatorCsrfToken)
        .send({ pass_number: 'FEST-2026-CC1-001' });

      expect(valRes.status).toBe(200);
      expect(valRes.body.data.valid).toBe(true);
    });
  });
});

