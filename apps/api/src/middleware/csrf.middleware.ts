import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getEnv } from '../config/env.js';
import { ForbiddenError } from '../errors/app-error.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF Protection Middleware for Cookie-Authenticated Requests.
 *
 * Implements Defense-in-Depth against Cross-Site Request Forgery:
 * 1. Safe read-only methods (GET, HEAD, OPTIONS) are exempt.
 * 2. Requests authenticated purely via Authorization: Bearer header (with no auth cookie present) are exempt.
 * 3. For any request where the session relies on cookies:
 *    a) Origin / Referer Validation:
 *       - Checks Origin or Referer against configured CORS_ORIGIN or authorized localhost.
 *       - Rejects untrusted origins or missing origins in production.
 *    b) Double-Submit CSRF Token Validation:
 *       - Requires matching CSRF token between the client-sent header (X-CSRF-Token / x-xsrf-token)
 *         and the readable CSRF cookie (festconnect_csrf).
 *       - Token is validated using crypto.timingSafeEqual to prevent timing attacks.
 */
export function csrfProtection(req: Request, _res: Response, next: NextFunction): void {
  // 1. Safe read-only methods are exempt
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const env = getEnv();
  const hasAuthCookie = Boolean(req.cookies && req.cookies[env.COOKIE_NAME]);

  // If no auth cookie is present and request is either unauthenticated (e.g. login/register)
  // or authenticated via pure Bearer token, CSRF check is exempt.
  if (!hasAuthCookie) {
    return next();
  }

  // 2. Validate Origin / Referer
  const originHeader = req.headers.origin;
  const refererHeader = req.headers.referer;
  let requestOrigin: string | null = null;

  if (originHeader) {
    requestOrigin = originHeader;
  } else if (refererHeader) {
    try {
      requestOrigin = new URL(refererHeader).origin;
    } catch {
      return next(new ForbiddenError('CSRF verification failed: malformed referer URL.'));
    }
  }

  const allowedOrigin = env.CORS_ORIGIN;

  if (requestOrigin) {
    const isLocalhost = requestOrigin.includes('localhost') || requestOrigin.includes('127.0.0.1');
    const matchesConfigured = requestOrigin === allowedOrigin;

    if (!isLocalhost && !matchesConfigured) {
      return next(new ForbiddenError('CSRF verification failed: request origin is not permitted.'));
    }
  } else if (env.NODE_ENV === 'production') {
    // Missing origin on cookie-authenticated mutation in production is strictly forbidden
    return next(new ForbiddenError('CSRF verification failed: missing origin or referer header.'));
  }

  // 3. Double-Submit CSRF Token Validation
  const tokenFromHeader = (req.headers['x-csrf-token'] || req.headers['x-xsrf-token']) as string | undefined;
  const tokenFromCookie = req.cookies[env.CSRF_COOKIE_NAME] as string | undefined;

  // Validate presence
  if (!tokenFromHeader || !tokenFromCookie) {
    return next(
      new ForbiddenError('CSRF verification failed: missing CSRF token in header or cookie.')
    );
  }

  // Validate format (64-character hex string representing 32 random bytes)
  if (
    typeof tokenFromHeader !== 'string' ||
    typeof tokenFromCookie !== 'string' ||
    tokenFromHeader.length !== 64 ||
    tokenFromCookie.length !== 64 ||
    !/^[0-9a-fA-F]{64}$/.test(tokenFromHeader) ||
    !/^[0-9a-fA-F]{64}$/.test(tokenFromCookie)
  ) {
    return next(new ForbiddenError('CSRF verification failed: invalid CSRF token format.'));
  }

  // Constant-time comparison to prevent timing attacks
  const headerBuf = Buffer.from(tokenFromHeader, 'hex');
  const cookieBuf = Buffer.from(tokenFromCookie, 'hex');

  if (headerBuf.length !== cookieBuf.length || !crypto.timingSafeEqual(headerBuf, cookieBuf)) {
    return next(new ForbiddenError('CSRF verification failed: CSRF token mismatch.'));
  }

  next();
}
