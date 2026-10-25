import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createApp } from '../src/app.js';
import { authenticate, requireAuth, requireRole } from '../src/middleware/auth.middleware.js';
import { csrfProtection } from '../src/middleware/csrf.middleware.js';
import { errorHandler } from '../src/middleware/error.middleware.js';

describe('Phase 03 — Authentication & Authorization Verification Suite', () => {
  const app = createApp();

  // Test app configured specifically to test auth/role/csrf middlewares in isolation
  const guardApp = express();
  guardApp.use(cookieParser());
  guardApp.use(express.json());
  guardApp.use(authenticate);

  guardApp.get(
    '/test/coordinator-only',
    requireAuth,
    requireRole('COORDINATOR', 'ADMIN'),
    (req, res) => {
      res.json({ message: 'Welcome coordinator', user: req.user });
    }
  );

  guardApp.get(
    '/test/admin-only',
    requireAuth,
    requireRole('ADMIN'),
    (req, res) => {
      res.json({ message: 'Welcome admin', user: req.user });
    }
  );

  guardApp.post(
    '/test/protected-mutation',
    csrfProtection,
    requireAuth,
    (_req, res) => {
      res.json({ message: 'Mutation applied successfully' });
    }
  );

  guardApp.use(errorHandler);

  const uniqueSuffix = Date.now();
  const testParticipantEmail = `tester_${uniqueSuffix}@festconnect.edu`;

  describe('1. Participant Registration (POST /api/v1/auth/register)', () => {
    it('successfully registers a participant with valid credentials and skills', async () => {
      const payload = {
        first_name: 'Test',
        last_name: 'Participant',
        email: testParticipantEmail,
        password: 'securePassword123!',
        phone: '+91 9876543210',
        college_name: 'Vellore Institute of Technology',
        date_of_birth: '2004-05-15',
        skills: ['TypeScript', 'Express', 'MySQL'],
      };

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.message).toContain('registered successfully');
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testParticipantEmail);
      expect(res.body.user.role).toBe('PARTICIPANT');
      expect(res.body.user.skills).toEqual(expect.arrayContaining(['TypeScript', 'Express', 'MySQL']));

      // Invariant: password_hash must NEVER be exposed
      expect(res.body.user.password_hash).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('password_hash');
      expect(JSON.stringify(res.body)).not.toContain('securePassword123!');

      // Verifies HttpOnly auth cookie is set
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/festconnect_token=/);
      expect(cookies[0]).toMatch(/HttpOnly/i);
      expect(cookies[0]).toMatch(/SameSite=Lax/i);
    });

    it('rejects duplicate registration with same email with 409 CONFLICT', async () => {
      const payload = {
        first_name: 'Duplicate',
        last_name: 'User',
        email: testParticipantEmail,
        password: 'securePassword123!',
      };

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(payload);

      expect(res.status).toBe(409);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('CONFLICT');
      expect(res.body.error.message).toContain('already exists');
    });

    it('rejects registration with short password (< 8 chars) with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          first_name: 'Short',
          last_name: 'Pass',
          email: `shortpass_${uniqueSuffix}@festconnect.edu`,
          password: '123',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(JSON.stringify(res.body.error.details)).toContain('at least 8 characters');
    });

    it('rejects registration with invalid email format with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          first_name: 'Bad',
          last_name: 'Email',
          email: 'not-an-email',
          password: 'securePassword123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects registration attempt injecting privileged role (COORDINATOR/ADMIN)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          first_name: 'Hacker',
          last_name: 'Attempt',
          email: `privilege_${uniqueSuffix}@festconnect.edu`,
          password: 'securePassword123!',
          role: 'ADMIN', // Client tries to elevate privilege
        });

      // Strict schema validation rejects unexpected extra keys
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(JSON.stringify(res.body.error.details)).toContain('Unrecognized');
    });
  });

  describe('2. User Login (POST /api/v1/auth/login)', () => {
    it('successfully logs in seeded demo participant with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'adwait@festconnect.edu',
          password: 'demo1234',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Login successful.');
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('adwait@festconnect.edu');
      expect(res.body.user.role).toBe('PARTICIPANT');
      expect(res.body.user.password_hash).toBeUndefined();

      // Check cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/festconnect_token=/);
      expect(cookies[0]).toMatch(/HttpOnly/i);
    });

    it('successfully logs in seeded demo coordinator and includes coordinator_id', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'coordinator@festconnect.edu',
          password: 'demo1234',
        });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('coordinator@festconnect.edu');
      expect(res.body.user.role).toBe('COORDINATOR');
      expect(res.body.user.coordinator_id).toBeDefined();
      expect(typeof res.body.user.coordinator_id).toBe('number');
    });

    it('successfully logs in seeded demo admin', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@festconnect.edu',
          password: 'demo1234',
        });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('admin@festconnect.edu');
      expect(res.body.user.role).toBe('ADMIN');
    });

    it('rejects login with wrong password with 401 AUTHENTICATION_FAILED', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'adwait@festconnect.edu',
          password: 'wrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('AUTHENTICATION_FAILED');
      expect(res.body.error.message).toBe('Invalid email or password.');
    });

    it('rejects login with nonexistent email with 401 AUTHENTICATION_FAILED', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nobody@festconnect.edu',
          password: 'demo1234',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTHENTICATION_FAILED');
      expect(res.body.error.message).toBe('Invalid email or password.');
    });
  });

  describe('3. Current User Profile (GET /api/v1/auth/me)', () => {
    it('returns 401 AUTHENTICATION_FAILED when unauthenticated', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTHENTICATION_FAILED');
    });

    it('returns user profile when authenticated via cookie', async () => {
      // 1. Log in to acquire cookie
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'adwait@festconnect.edu',
          password: 'demo1234',
        });

      const authCookie = loginRes.headers['set-cookie'];

      // 2. Access /me with the cookie
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('adwait@festconnect.edu');
      expect(res.body.user.first_name).toBe('Adwait');
      expect(res.body.user.role).toBe('PARTICIPANT');
    });

    it('returns user profile when authenticated via Authorization Bearer token', async () => {
      // 1. Log in to get token from cookie
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'coordinator@festconnect.edu',
          password: 'demo1234',
        });

      const rawCookie = loginRes.headers['set-cookie'][0];
      const tokenMatch = rawCookie.match(/festconnect_token=([^;]+)/);
      const token = tokenMatch ? tokenMatch[1] : '';

      // 2. Access /me with Bearer token
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('coordinator@festconnect.edu');
      expect(res.body.user.role).toBe('COORDINATOR');
    });

    it('rejects malformed token with 401 AUTHENTICATION_FAILED', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.token.value');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTHENTICATION_FAILED');
    });
  });

  describe('4. Logout (POST /api/v1/auth/logout)', () => {
    it('clears both auth and CSRF cookies on logout', async () => {
      const res = await request(app).post('/api/v1/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged out successfully.');

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c: string) => c.includes('festconnect_token=;'))).toBe(true);
      expect(cookies.some((c: string) => c.includes('festconnect_csrf=;'))).toBe(true);
    });
  });

  describe('5. Role-Based Authorization Guards (requireRole)', () => {
    it('forbids PARTICIPANT from accessing coordinator-only route with 403 FORBIDDEN', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'adwait@festconnect.edu',
          password: 'demo1234',
        });
      const cookie = loginRes.headers['set-cookie'];

      const res = await request(guardApp)
        .get('/test/coordinator-only')
        .set('Cookie', cookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain('COORDINATOR');
    });

    it('allows COORDINATOR to access coordinator-only route with 200 OK', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'coordinator@festconnect.edu',
          password: 'demo1234',
        });
      const cookie = loginRes.headers['set-cookie'];

      const res = await request(guardApp)
        .get('/test/coordinator-only')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Welcome coordinator');
    });

    it('forbids COORDINATOR from accessing admin-only route with 403 FORBIDDEN', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'coordinator@festconnect.edu',
          password: 'demo1234',
        });
      const cookie = loginRes.headers['set-cookie'];

      const res = await request(guardApp)
        .get('/test/admin-only')
        .set('Cookie', cookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('allows ADMIN to access admin-only route with 200 OK', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@festconnect.edu',
          password: 'demo1234',
        });
      const cookie = loginRes.headers['set-cookie'];

      const res = await request(guardApp)
        .get('/test/admin-only')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Welcome admin');
    });
  });

  describe('6. CSRF Protection for Cookie-Authenticated Mutations', () => {
    it('blocks cookie-authenticated mutation when Origin is untrusted', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'adwait@festconnect.edu',
          password: 'demo1234',
        });
      const cookie = loginRes.headers['set-cookie'];
      const csrfToken = loginRes.body.csrfToken;

      const res = await request(guardApp)
        .post('/test/protected-mutation')
        .set('Cookie', cookie)
        .set('Origin', 'http://malicious-attacker-site.com')
        .set('X-CSRF-Token', csrfToken);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain('CSRF verification failed');
    });

    it('allows cookie-authenticated mutation when Origin and CSRF token match', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'adwait@festconnect.edu',
          password: 'demo1234',
        });
      const cookie = loginRes.headers['set-cookie'];
      const csrfToken = loginRes.body.csrfToken;

      const res = await request(guardApp)
        .post('/test/protected-mutation')
        .set('Cookie', cookie)
        .set('Origin', 'http://localhost:5173')
        .set('X-CSRF-Token', csrfToken);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Mutation applied successfully');
    });
  });
});
