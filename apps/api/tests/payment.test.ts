import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { getDbPool } from '../src/db/connection.js';
import { runSeeds } from '../src/db/seed.js';
import { PaymentFactory } from '../src/factories/payment.factory.js';
import { MockPaymentGatewayAdapter } from '../src/adapters/payment/mock-payment-gateway.adapter.js';

describe('Phase 06 — Payment Factory & Adapter Integration Suite', () => {
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

  let outsiderCookie: string[];
  let outsiderCsrfToken: string;

  // Test entities created during the test run
  let testTeamId: number;
  let testRegistrationId: number;
  let testEventFee: string;

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

    // 4. Team member login (shivam@festconnect.edu / demo1234)
    const memberLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'shivam@festconnect.edu', password: 'demo1234' });
    memberCookie = memberLogin.headers['set-cookie'] || [];
    memberCsrfToken = memberLogin.body.csrfToken;

    // 5. Outsider participant register + login (fresh account)
    const timestamp = Date.now();
    const outsiderEmail = `outsider_pay_${timestamp}@festconnect.edu`;
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: outsiderEmail,
        password: 'Password123!',
        first_name: 'Outsider',
        last_name: 'Tester',
        college_name: 'Fest Tech Institute',
      });

    const outsiderLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: outsiderEmail, password: 'Password123!' });
    outsiderCookie = outsiderLogin.headers['set-cookie'] || [];
    outsiderCsrfToken = outsiderLogin.body.csrfToken;

    // 6. Setup a fresh team and registration for payment tests
    // Create Team 2 led by Adwait
    const createTeamRes = await request(app)
      .post('/api/v1/teams')
      .set('Cookie', leaderCookie)
      .set('x-csrf-token', leaderCsrfToken)
      .send({ team_name: 'Payment Test Squadron' });
    expect(createTeamRes.status).toBe(201);
    testTeamId = createTeamRes.body.data.team_id;

    // Add Shivam as member
    await request(app)
      .post(`/api/v1/teams/${testTeamId}/members`)
      .set('Cookie', leaderCookie)
      .set('x-csrf-token', leaderCsrfToken)
      .send({ email: 'shivam@festconnect.edu' });

    // Fetch Event 2 fee (Autonomous Robotics Challenge, min: 2, max: 4, fee: 250.00)
    const eventRes = await request(app).get('/api/v1/events/2');
    testEventFee = eventRes.body.data.registration_fee;

    // Register Team 2 for Event 2 (initial status: PENDING_PAYMENT)
    const regRes = await request(app)
      .post('/api/v1/registrations')
      .set('Cookie', leaderCookie)
      .set('x-csrf-token', leaderCsrfToken)
      .send({ team_id: testTeamId, event_id: 2 });
    expect(regRes.status).toBe(201);
    testRegistrationId = regRes.body.data.registration_id;
    expect(regRes.body.data.status).toBe('PENDING_PAYMENT');
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  // ============================================================================
  // 1. Payment Factory & Adapter Design Pattern Tests
  // ============================================================================
  describe('1. Payment Factory & Adapter Architecture', () => {
    it('PaymentFactory selects the default mock provider in development', () => {
      const adapter = PaymentFactory.getAdapter();
      expect(adapter).toBeInstanceOf(MockPaymentGatewayAdapter);
      expect(adapter.providerName).toBe('MOCK');
    });

    it('PaymentFactory selects mock provider when explicitly requested', () => {
      const adapter = PaymentFactory.getAdapter('mock');
      expect(adapter).toBeInstanceOf(MockPaymentGatewayAdapter);
      expect(adapter.providerName).toBe('MOCK');
    });

    it('PaymentFactory fails safely for an unsupported provider', () => {
      expect(() => PaymentFactory.getAdapter('bitcoin_gateway')).toThrow(
        /Unsupported payment provider/i
      );
    });

    it('PaymentFactory refuses mock provider when configured in production', () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        expect(() => PaymentFactory.getAdapter('mock')).toThrow(
          /Production configuration forbids the mock payment provider/i
        );
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('PaymentFactory does not silently fall back to mock when real provider is configured', () => {
      expect(() => PaymentFactory.getAdapter('stripe')).toThrow(
        /real money gateways are not enabled/i
      );
      expect(() => PaymentFactory.getAdapter('razorpay')).toThrow(
        /real money gateways are not enabled/i
      );
    });

    it('MockPaymentGatewayAdapter returns the documented structured result shape', async () => {
      const adapter = new MockPaymentGatewayAdapter();
      const result = await adapter.processPayment({
        registrationId: 999,
        attemptNumber: 1,
        amount: 250.0,
        currency: 'INR',
        teamName: 'Alpha Team',
        eventName: 'Demo Hackathon',
        participantEmail: 'demo@festconnect.edu',
        simulatedOutcome: 'SUCCESS',
      });

      expect(result).toHaveProperty('transactionId');
      expect(result.transactionId).toMatch(/^MOCK-SUCC-/);
      expect(result.paymentStatus).toBe('SUCCESS');
      expect(result.paymentMethod).toBe('MOCK');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.rawResponse).toBeDefined();
      expect(result.rawResponse?.notice).toBe('Demo payment — no real money is charged');
    });

    it('MockPaymentGatewayAdapter fails safely in production environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        const adapter = new MockPaymentGatewayAdapter();
        await expect(
          adapter.processPayment({
            registrationId: 999,
            attemptNumber: 1,
            amount: 250.0,
            currency: 'INR',
            teamName: 'Alpha Team',
            eventName: 'Demo Hackathon',
            participantEmail: 'demo@festconnect.edu',
          })
        ).rejects.toThrow(/Mock payment gateway is strictly prohibited in production/i);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  // ============================================================================
  // 2. Authorization, Security & Validation Tests
  // ============================================================================
  describe('2. Authorization, CSRF & Validation Gate', () => {
    it('rejects unauthenticated payment initiation with 401', async () => {
      const res = await request(app)
        .post(`/api/v1/registrations/${testRegistrationId}/payments`)
        .send({});
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTHENTICATION_FAILED');
    });

    it('rejects cookie-authenticated payment initiation without CSRF token with 403', async () => {
      const res = await request(app)
        .post(`/api/v1/registrations/${testRegistrationId}/payments`)
        .set('Cookie', leaderCookie)
        .send({});
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects non-existent registration payment initiation with 404', async () => {
      const res = await request(app)
        .post('/api/v1/registrations/999999/payments')
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken)
        .send({});
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('rejects payment initiation by a team member who is not the team leader with 403', async () => {
      const res = await request(app)
        .post(`/api/v1/registrations/${testRegistrationId}/payments`)
        .set('Cookie', memberCookie)
        .set('x-csrf-token', memberCsrfToken)
        .send({});
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toMatch(/only the team leader/i);
    });

    it('rejects payment initiation by an outsider participant with 403', async () => {
      const res = await request(app)
        .post(`/api/v1/registrations/${testRegistrationId}/payments`)
        .set('Cookie', outsiderCookie)
        .set('x-csrf-token', outsiderCsrfToken)
        .send({});
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects client attempt to inject authoritative payment status or amount with 400', async () => {
      const res = await request(app)
        .post(`/api/v1/registrations/${testRegistrationId}/payments`)
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken)
        .send({
          amount: 0.01,
          payment_status: 'SUCCESS',
          status: 'CONFIRMED',
        });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects payment initiation for an already confirmed & paid registration with 409', async () => {
      // Registration 1 from seed data is already CONFIRMED
      const res = await request(app)
        .post('/api/v1/registrations/1/payments')
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken)
        .send({});
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
      expect(res.body.error.message).toMatch(/already been paid/i);
    });
  });

  // ============================================================================
  // 3. Payment Outcomes, Retries & State Transitions
  // ============================================================================
  describe('3. Payment Outcomes, State Transitions & Retries', () => {
    let failedPaymentId: number;

    it('simulates a FAILED payment attempt: preserves PENDING_PAYMENT registration state', async () => {
      const res = await request(app)
        .post(`/api/v1/registrations/${testRegistrationId}/payments`)
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken)
        .send({ simulated_outcome: 'FAILED' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.payment_status).toBe('FAILED');
      expect(res.body.data.attempt_number).toBe(1);
      expect(res.body.data.transaction_id).toMatch(/^MOCK-FAIL-/);
      expect(res.body.data.amount).toBe(testEventFee); // Server-derived fee
      failedPaymentId = res.body.data.payment_id;

      // Verify registration remains PENDING_PAYMENT
      const regCheck = await request(app)
        .get(`/api/v1/registrations/${testRegistrationId}`)
        .set('Cookie', leaderCookie);
      expect(regCheck.body.data.status).toBe('PENDING_PAYMENT');
    });

    it('simulates a PENDING payment attempt: preserves PENDING_PAYMENT registration state', async () => {
      const res = await request(app)
        .post(`/api/v1/registrations/${testRegistrationId}/payments`)
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken)
        .send({ simulated_outcome: 'PENDING' });

      expect(res.status).toBe(201);
      expect(res.body.data.payment_status).toBe('PENDING');
      expect(res.body.data.attempt_number).toBe(2); // Increments attempt number
      expect(res.body.data.transaction_id).toMatch(/^MOCK-PEND-/);

      // Verify registration remains PENDING_PAYMENT
      const regCheck = await request(app)
        .get(`/api/v1/registrations/${testRegistrationId}`)
        .set('Cookie', leaderCookie);
      expect(regCheck.body.data.status).toBe('PENDING_PAYMENT');
    });

    it('supports retry with SUCCESS: transitions registration to CONFIRMED atomically', async () => {
      const res = await request(app)
        .post(`/api/v1/registrations/${testRegistrationId}/payments`)
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken)
        .send({ simulated_outcome: 'SUCCESS' });

      expect(res.status).toBe(201);
      expect(res.body.data.payment_status).toBe('SUCCESS');
      expect(res.body.data.attempt_number).toBe(3); // Attempt 3 succeeded
      expect(res.body.data.transaction_id).toMatch(/^MOCK-SUCC-/);
      expect(res.body.data.registration_status).toBe('CONFIRMED');

      // Verify database registration state transitioned to CONFIRMED
      const regCheck = await request(app)
        .get(`/api/v1/registrations/${testRegistrationId}`)
        .set('Cookie', leaderCookie);
      expect(regCheck.body.data.status).toBe('CONFIRMED');
    });

    it('rejects subsequent payment attempt on now-CONFIRMED registration with 409 Conflict', async () => {
      const res = await request(app)
        .post(`/api/v1/registrations/${testRegistrationId}/payments`)
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken)
        .send({ simulated_outcome: 'SUCCESS' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
      expect(res.body.error.message).toMatch(/already been paid and confirmed/i);
    });

    it('top-level POST /api/v1/payments endpoint works identically', async () => {
      // Create Team 3 & Registration 3 for another event (Event 3, fee: 50.00)
      const teamRes = await request(app)
        .post('/api/v1/teams')
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken)
        .send({ team_name: 'TopLevel Payment Team' });
      const newTeamId = teamRes.body.data.team_id;

      const regRes = await request(app)
        .post('/api/v1/registrations')
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken)
        .send({ team_id: newTeamId, event_id: 3 });
      const newRegId = regRes.body.data.registration_id;

      // Initiate via top-level endpoint
      const payRes = await request(app)
        .post('/api/v1/payments')
        .set('Cookie', leaderCookie)
        .set('x-csrf-token', leaderCsrfToken)
        .send({ registration_id: newRegId, simulated_outcome: 'SUCCESS' });

      expect(payRes.status).toBe(201);
      expect(payRes.body.data.payment_status).toBe('SUCCESS');
      expect(payRes.body.data.amount).toBe('100.00'); // Event 3 fee
    });
  });

  // ============================================================================
  // 4. Payment Retrieval & Audit Endpoint Tests
  // ============================================================================
  describe('4. Payment Retrieval & Audit Endpoint Tests', () => {
    it('lists all payment attempts for a registration in chronological order', async () => {
      const res = await request(app)
        .get(`/api/v1/registrations/${testRegistrationId}/payments`)
        .set('Cookie', leaderCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(3); // FAILED (1), PENDING (2), SUCCESS (3)
      expect(res.body.data[0].attempt_number).toBe(1);
      expect(res.body.data[0].payment_status).toBe('FAILED');
      expect(res.body.data[1].attempt_number).toBe(2);
      expect(res.body.data[1].payment_status).toBe('PENDING');
      expect(res.body.data[2].attempt_number).toBe(3);
      expect(res.body.data[2].payment_status).toBe('SUCCESS');
    });

    it('allows enrolled team member to view registration payments', async () => {
      const res = await request(app)
        .get(`/api/v1/registrations/${testRegistrationId}/payments`)
        .set('Cookie', memberCookie);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(3);
    });

    it('rejects outsider participant from viewing registration payments with 403', async () => {
      const res = await request(app)
        .get(`/api/v1/registrations/${testRegistrationId}/payments`)
        .set('Cookie', outsiderCookie);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('allows coordinator to view registration payments', async () => {
      const res = await request(app)
        .get(`/api/v1/registrations/${testRegistrationId}/payments`)
        .set('Cookie', coordCookie);
      expect(res.status).toBe(200);
    });

    it('retrieves individual payment record by ID for authorized team member', async () => {
      const listRes = await request(app)
        .get(`/api/v1/registrations/${testRegistrationId}/payments`)
        .set('Cookie', leaderCookie);
      const paymentId = listRes.body.data[0].payment_id;

      const res = await request(app)
        .get(`/api/v1/payments/${paymentId}`)
        .set('Cookie', memberCookie);
      expect(res.status).toBe(200);
      expect(res.body.data.payment_id).toBe(paymentId);
      expect(res.body.data.team_name).toBe('Payment Test Squadron');
    });

    it('rejects retrieval of payment by an outsider with 403', async () => {
      const listRes = await request(app)
        .get(`/api/v1/registrations/${testRegistrationId}/payments`)
        .set('Cookie', leaderCookie);
      const paymentId = listRes.body.data[0].payment_id;

      const res = await request(app)
        .get(`/api/v1/payments/${paymentId}`)
        .set('Cookie', outsiderCookie);
      expect(res.status).toBe(403);
    });

    it('returns 404 for non-existent payment ID', async () => {
      const res = await request(app)
        .get('/api/v1/payments/999999')
        .set('Cookie', leaderCookie);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  // ============================================================================
  // 5. Database Level Constraint & Invariant Verification
  // ============================================================================
  describe('5. Database Single-Success Constraint & Invariants', () => {
    it('enforces at most ONE SUCCESS payment per registration at the MySQL schema level', async () => {
      const pool = getDbPool();

      // Directly attempt a raw SQL insert of a second SUCCESS payment for testRegistrationId
      await expect(
        pool.query(
          `INSERT INTO \`payment\` (
            \`registration_id\`, \`attempt_number\`, \`amount\`, \`payment_status\`,
            \`payment_method\`, \`transaction_id\`
          ) VALUES (?, 99, 250.00, 'SUCCESS', 'MOCK', 'TXN_RAW_SQL_DUP_TEST')`,
          [testRegistrationId]
        )
      ).rejects.toThrow(/Duplicate entry/);
    });

    it('permits multiple failed/pending attempts for the same registration at the database level', async () => {
      const pool = getDbPool();

      // Insert another FAILED attempt directly into MySQL
      const [result] = await pool.query<any>(
        `INSERT INTO \`payment\` (
          \`registration_id\`, \`attempt_number\`, \`amount\`, \`payment_status\`,
          \`payment_method\`, \`transaction_id\`
        ) VALUES (?, 100, 250.00, 'FAILED', 'MOCK', 'TXN_RAW_SQL_FAILED_PERMITTED')`,
        [testRegistrationId]
      );
      expect(result.affectedRows).toBe(1);
    });
  });
});
