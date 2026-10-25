import { Request, Response, NextFunction } from 'express';
import { getEnv } from '../config/env.js';
import { authService } from '../services/auth.service.js';
import { AuthTokenPayload, UserRole } from '../types/auth.types.js';
import { AuthenticationError, ForbiddenError } from '../errors/app-error.js';

// Extend Express Request interface to include optional authenticated user payload and auth source
declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
      authSource?: 'cookie' | 'bearer';
    }
  }
}

export interface ExtractedTokenInfo {
  token: string;
  source: 'cookie' | 'bearer';
}

/**
 * Extracts JWT token from Authorization Bearer header or HttpOnly cookie.
 * If Authorization header is provided, it takes precedence.
 * If Bearer header is invalid, does NOT silently fall back to cookie to prevent CSRF bypass.
 */
export function extractToken(req: Request): ExtractedTokenInfo | null {
  const env = getEnv();

  // 1. Check Authorization Bearer header first (API clients / tests)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return {
      token: authHeader.substring(7).trim(),
      source: 'bearer',
    };
  }

  // 2. Check HttpOnly cookie (primary browser auth strategy)
  if (req.cookies && req.cookies[env.COOKIE_NAME]) {
    return {
      token: req.cookies[env.COOKIE_NAME],
      source: 'cookie',
    };
  }

  return null;
}

/**
 * Middleware that parses and validates token if present, attaching user to req.user.
 * Does not reject requests if token is missing (optional authentication).
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const tokenInfo = extractToken(req);
  if (!tokenInfo) {
    return next();
  }

  try {
    const payload = authService.verifyToken(tokenInfo.token);
    req.user = payload;
    req.authSource = tokenInfo.source;
    next();
  } catch (err) {
    // If token was explicitly supplied but invalid/expired, pass authentication error
    next(err);
  }
}

/**
 * Middleware that requires a valid authenticated user.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new AuthenticationError('Authentication required. Please log in.'));
  }
  next();
}

/**
 * Middleware that requires the authenticated user to have at least one of the specified roles.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required. Please log in.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access denied. Requires one of the following roles: [${allowedRoles.join(', ')}].`
        )
      );
    }

    next();
  };
}
