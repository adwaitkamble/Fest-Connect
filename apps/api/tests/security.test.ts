import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { authService } from '../src/services/auth.service.js';
import { authenticate, requireAuth, requireRole } from '../src/middleware/auth.middleware.js';
import { csrfProtection } from '../src/middleware/csrf.middleware.js';
import { errorHandler } from '../src/middleware/error.middleware.js';
import { parseEnv, DEFAULT_DEV_JWT_SECRET, DEFAULT_DEV_PASS_HMAC_SECRET } from '../src/config/env.js';
import * as dbConnection from '../src/db/connection.js';

describe('Phase 03 — Comprehensive Security Gate & Invariant Verification Suite', () => {
  const app = createApp();

  // Test Express app configured with standard auth & csrf middleware
  const secureTestApp = express();
  secureTestApp.use(cookieParser());
  secureTestApp.use(express.json());
  secureTestApp.use(authenticate);

  secureTestApp.post(
    '/test/protected-mutation',
    csrfProtection,
    requireAuth,
    (_req, res) => {
      res.json({ success: true, message: 'Mutation verified' });
    }
  );

  secureTestApp.get(
    '/test/protected-read',
    requireAuth,
    (_req, res) => {
      res.json({ success: true, user: _req.user });
    }
  );

  secureTestApp.use(errorHandler);

  // ============================================================================
  // 1. JWT Handling & Algorithm Verification
  // ============================================================================
  describe('1. JWT Handling & Cryptographic Invariants', () => {
    it('rejects tokens signed with "none" algorithm (algorithm confusion attack)', () => {
      // Create a forged unsigned token with alg: none
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(
        JSON.stringify({
          userId: 1,
          email: 'admin@festconnect.edu',
          role: 'ADMIN',
          name: 'Hacker Admin',
        })
      ).toString('base64url');
      const unsignedToken = `${header}.${payload}.`;

      expect(() => authService.verifyToken(unsignedToken)).toThrow(
        'Invalid authentication token'
      );
    });

    it('rejects tokens signed with wrong secret or tampered signature', () => {
      const forgedToken = jwt.sign(
        { userId: 1, email: 'admin@festconnect.edu', role: 'ADMIN', name: 'Admin' },
        'attacker_private_secret_key_12345',
        { algorithm: 'HS256', expiresIn: '1h' }
      );

      expect(() => authService.verifyToken(forgedToken)).toThrow(
        'Invalid authentication token'
      );
    });

    it('rejects expired tokens server-side', () => {
      const expiredToken = jwt.sign(
        { userId: 1, email: 'adwait@festconnect.edu', role: 'PARTICIPANT', name: 'Adwait' },
        DEFAULT_DEV_JWT_SECRET,
        { algorithm: 'HS256', expiresIn: '-10s' } // Expired 10 seconds ago
      );

      expect(() => authService.verifyToken(expiredToken)).toThrow(
        'Session has expired'
      );
    });

    it('rejects structurally invalid or tampered token payload claims', () => {
      // Token signed with legitimate key but carrying forged/invalid role
      const invalidRoleToken = jwt.sign(
        { userId: 1, email: 'adwait@festconnect.edu', role: 'SUPERUSER', name: 'Adwait' },
        DEFAULT_DEV_JWT_SECRET,
        { algorithm: 'HS256', expiresIn: '1h' }
      );

      expect(() => authService.verifyToken(invalidRoleToken)).toThrow(
        'Invalid or untrusted authentication token claims'
      );

      // Token missing required userId
      const missingUserIdToken = jwt.sign(
        { email: 'adwait@festconnect.edu', role: 'PARTICIPANT', name: 'Adwait' },
        DEFAULT_DEV_JWT_SECRET,
        { algorithm: 'HS256', expiresIn: '1h' }
      );

      expect(() => authService.verifyToken(missingUserIdToken)).toThrow(
        'Invalid or untrusted authentication token claims'
      );
    });

    it('fails safely when production configuration falls back to default dev secret or weak key', () => {
      // 1. Production with default dev secret must fail
      expect(() =>
        parseEnv({
          NODE_ENV: 'production',
          JWT_SECRET: DEFAULT_DEV_JWT_SECRET,
          CORS_ORIGIN: 'https://festconnect.edu',
        })
      ).toThrow('Production configuration requires an explicit, non-default JWT_SECRET');

      // 2. Production with short secret (< 32 chars) must fail
      expect(() =>
        parseEnv({
          NODE_ENV: 'production',
          JWT_SECRET: 'secret_too_short_24_chars',
          CORS_ORIGIN: 'https://festconnect.edu',
        })
      ).toThrow('Production JWT_SECRET must be at least 32 characters long');

      // 3. Valid production configuration passes
      const validProd = parseEnv({
        NODE_ENV: 'production',
        JWT_SECRET: 'a_very_strong_production_secret_key_exceeding_32_bytes_length!',
        PASS_HMAC_SECRET: 'production_pass_hmac_secret_crypto_safe_min32chars!',
        CORS_ORIGIN: 'https://festconnect.edu',
      });
      expect(validProd.NODE_ENV).toBe('production');
      expect(validProd.JWT_SECRET.length).toBeGreaterThanOrEqual(32);
    });
  });

  // ============================================================================
  // 2. Session Cookie Invariants
  // ============================================================================
  describe('2. Session Cookie Attributes & Clearing', () => {
    it('sets HttpOnly, Path=/, and SameSite=Lax attributes on login', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'adwait@festconnect.edu',
          password: 'demo1234',
        });

      expect(res.status).toBe(200);
      const cookies = res.headers['set-cookie'] as string[];
      expect(cookies).toBeDefined();

      const authCookie = cookies.find((c) => c.startsWith('festconnect_token='));
      expect(authCookie).toBeDefined();
      expect(authCookie).toMatch(/HttpOnly/i);
      expect(authCookie).toMatch(/Path=\//i);
      expect(authCookie).toMatch(/SameSite=Lax/i);

      // CSRF cookie is also set and intentionally readable by SPA script
      const csrfCookie = cookies.find((c) => c.startsWith('festconnect_csrf='));
      expect(csrfCookie).toBeDefined();
      expect(csrfCookie).not.toMatch(/HttpOnly/i);
    });

    it('logout clears both auth and CSRF cookies with identical path attribute', async () => {
      const res = await request(app).post('/api/v1/auth/logout');

      expect(res.status).toBe(200);
      const cookies = res.headers['set-cookie'] as string[];
      expect(cookies).toBeDefined();

      const clearedAuth = cookies.find((c) => c.startsWith('festconnect_token=;'));
      const clearedCsrf = cookies.find((c) => c.startsWith('festconnect_csrf=;'));

      expect(clearedAuth).toBeDefined();
      expect(clearedAuth).toMatch(/Path=\//i);
      expect(clearedCsrf).toBeDefined();
      expect(clearedCsrf).toMatch(/Path=\//i);
    });
  });

  // ============================================================================
  // 3. CSRF & CORS Security Gate
  // ============================================================================
  describe('3. CSRF Protection & Bearer Authorization Bypass Prevention', () => {
    it('rejects cookie-authenticated mutation when X-CSRF-Token header is missing', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'adwait@festconnect.edu',
          password: 'demo1234',
        });
      const cookie = loginRes.headers['set-cookie'];

      const res = await request(secureTestApp)
        .post('/test/protected-mutation')
        .set('Cookie', cookie)
        .set('Origin', 'http://localhost:5173');
      // No X-CSRF-Token provided

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain('missing CSRF token');
    });

    it('rejects cookie-authenticated mutation when X-CSRF-Token is mismatched or forged', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'adwait@festconnect.edu',
          password: 'demo1234',
        });
      const cookie = loginRes.headers['set-cookie'];
      const forgedCsrfToken = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

      const res = await request(secureTestApp)
        .post('/test/protected-mutation')
        .set('Cookie', cookie)
        .set('Origin', 'http://localhost:5173')
        .set('X-CSRF-Token', forgedCsrfToken);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain('CSRF token mismatch');
    });

    it('rejects cookie-authenticated mutation when Origin is unauthorized even with valid CSRF token', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'adwait@festconnect.edu',
          password: 'demo1234',
        });
      const cookie = loginRes.headers['set-cookie'];
      const validCsrf = loginRes.body.csrfToken;

      const res = await request(secureTestApp)
        .post('/test/protected-mutation')
        .set('Cookie', cookie)
        .set('Origin', 'https://attacker-phishing-festconnect.com')
        .set('X-CSRF-Token', validCsrf);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain('request origin is not permitted');
    });

    it('allows cookie-authenticated mutation when Origin and CSRF token are valid', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'adwait@festconnect.edu',
          password: 'demo1234',
        });
      const cookie = loginRes.headers['set-cookie'];
      const validCsrf = loginRes.body.csrfToken;

      const res = await request(secureTestApp)
        .post('/test/protected-mutation')
        .set('Cookie', cookie)
        .set('Origin', 'http://localhost:5173')
        .set('X-CSRF-Token', validCsrf);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('allows pure Bearer-authenticated API clients without cookies and without CSRF token', async () => {
      const token = authService.signToken({
        userId: 1,
        email: 'adwait@festconnect.edu',
        role: 'PARTICIPANT',
        name: 'Adwait',
      });

      const res = await request(secureTestApp)
        .post('/test/protected-mutation')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('prevents Bearer CSRF bypass: invalid Bearer header does NOT fall back to auth cookie', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'adwait@festconnect.edu',
          password: 'demo1234',
        });
      const cookie = loginRes.headers['set-cookie'];

      // Attacker attempts to bypass CSRF by attaching a bogus Bearer header
      const res = await request(secureTestApp)
        .post('/test/protected-mutation')
        .set('Cookie', cookie)
        .set('Authorization', 'Bearer invalid_bypass_attempt');

      // Must be rejected with 401 AUTHENTICATION_FAILED, not permitted or fallen back
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTHENTICATION_FAILED');
    });
  });

  // ============================================================================
  // 4. Registration, Roles & Account Provisioning
  // ============================================================================
  describe('4. Registration & Privileged Account Provisioning Constraints', () => {
    it('public registration strictly forces role=PARTICIPANT even if client tries to inject role', async () => {
      const uniqueSuffix = Date.now();
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          first_name: 'Privilege',
          last_name: 'Escalation',
          email: `escalate_${uniqueSuffix}@festconnect.edu`,
          password: 'password123!',
          role: 'ADMIN', // Client tries to become ADMIN
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(JSON.stringify(res.body.error.details)).toContain('Unrecognized');
    });

    it('login failures do not reveal whether an account exists (enumeration defense)', async () => {
      const nonExistentRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'does_not_exist_at_all@festconnect.edu',
          password: 'somePassword123!',
        });

      const wrongPasswordRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'adwait@festconnect.edu',
          password: 'incorrectPassword!',
        });

      // Both must return identical 401 status and error message
      expect(nonExistentRes.status).toBe(401);
      expect(wrongPasswordRes.status).toBe(401);
      expect(nonExistentRes.body.error.message).toBe('Invalid email or password.');
      expect(wrongPasswordRes.body.error.message).toBe('Invalid email or password.');
    });
  });

  // ============================================================================
  // 5. Readiness, Liveness & Error Handling
  // ============================================================================
  describe('5. Health, Readiness Probes & Production Error Redaction', () => {
    it('/api/health serves as pure liveness check returning 200', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.liveness).toBe('ok');
    });

    it('/api/ready returns 200 when database is healthy and ready', async () => {
      const res = await request(app).get('/api/ready');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
      expect(res.body.dependencies.database.connected).toBe(true);
    });

    it('/api/ready returns 503 Service Unavailable when database connection fails', async () => {
      // Temporarily mock checkDbConnection to simulate database outage
      const spy = vi.spyOn(dbConnection, 'checkDbConnection').mockResolvedValueOnce({
        connected: false,
        error: 'ECONNREFUSED: Database server is unreachable',
      });

      const res = await request(app).get('/api/ready');

      expect(res.status).toBe(503);
      expect(res.body.status).toBe('unhealthy');
      expect(res.body.dependencies.database.connected).toBe(false);
      expect(res.body.dependencies.database.error).toContain('ECONNREFUSED');

      spy.mockRestore();
    });

    it('production error handler redacts stack traces and internal exception messages', async () => {
      const prodApp = express();
      prodApp.get('/test/boom', () => {
        throw new Error('Sensitive database internal error details');
      });

      // Temporarily set NODE_ENV to production
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        prodApp.use(errorHandler);

        const res = await request(prodApp).get('/test/boom');

        expect(res.status).toBe(500);
        expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR');
        expect(res.body.error.message).toBe('An unexpected server error occurred.');
        expect(res.body.error.details).toEqual([]);
        expect(JSON.stringify(res.body)).not.toContain('Sensitive database internal');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  // ============================================================================
  // 6. Environment Configuration & Secret Hardening (Phase 07)
  // ============================================================================
  describe('6. Environment Configuration & Secret Hardening', () => {
    it('rejects missing or default PASS_HMAC_SECRET in production mode', () => {
      const prodEnvDefaultSecret = {
        NODE_ENV: 'production',
        JWT_SECRET: 'production_super_strong_jwt_secret_min32chars_long!',
        PASS_HMAC_SECRET: DEFAULT_DEV_PASS_HMAC_SECRET,
        CORS_ORIGIN: 'https://festconnect.example.com',
      };

      expect(() => parseEnv(prodEnvDefaultSecret)).toThrow(
        'Production configuration requires an explicit, non-default PASS_HMAC_SECRET'
      );
    });

    it('rejects short PASS_HMAC_SECRET (<32 chars) in production mode', () => {
      const prodEnvShortSecret = {
        NODE_ENV: 'production',
        JWT_SECRET: 'production_super_strong_jwt_secret_min32chars_long!',
        PASS_HMAC_SECRET: 'short_secret_123',
        CORS_ORIGIN: 'https://festconnect.example.com',
      };

      expect(() => parseEnv(prodEnvShortSecret)).toThrow(
        'Production PASS_HMAC_SECRET must be at least 32 characters long.'
      );
    });

    it('accepts strong PASS_HMAC_SECRET (>=32 chars) and non-default JWT_SECRET in production mode', () => {
      const validProdEnv = {
        NODE_ENV: 'production',
        JWT_SECRET: 'production_super_strong_jwt_secret_min32chars_long!',
        PASS_HMAC_SECRET: 'production_pass_hmac_secret_crypto_safe_min32chars!',
        CORS_ORIGIN: 'https://festconnect.example.com',
      };

      const parsed = parseEnv(validProdEnv);
      expect(parsed.NODE_ENV).toBe('production');
      expect(parsed.PASS_HMAC_SECRET).toBe('production_pass_hmac_secret_crypto_safe_min32chars!');
    });
  });
});
