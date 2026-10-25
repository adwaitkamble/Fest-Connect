import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getEnv } from '../config/env.js';
import { authService, AuthService } from '../services/auth.service.js';
import { RegisterSchemaInput, LoginSchemaInput } from '../schemas/auth.schema.js';

export class AuthController {
  constructor(private readonly auth: AuthService = authService) {}

  /**
   * Sets both HttpOnly authentication JWT cookie and client-readable CSRF cookie.
   */
  private setAuthCookies(res: Response, token: string): string {
    const env = getEnv();
    const isProduction = env.NODE_ENV === 'production';
    const isSecure = env.COOKIE_SECURE ?? isProduction;

    // 1. HttpOnly JWT Auth Cookie
    res.cookie(env.COOKIE_NAME, token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: env.COOKIE_SAME_SITE,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
    });

    // 2. Client-readable CSRF Token Cookie (Double-Submit Cookie Pattern)
    const csrfToken = crypto.randomBytes(32).toString('hex');
    res.cookie(env.CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: false, // Must be readable by frontend JavaScript to populate X-CSRF-Token header
      secure: isSecure,
      sameSite: env.COOKIE_SAME_SITE,
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });

    return csrfToken;
  }

  /**
   * Clears both session authentication and CSRF cookies on logout.
   */
  private clearAuthCookies(res: Response): void {
    const env = getEnv();
    const isProduction = env.NODE_ENV === 'production';
    const isSecure = env.COOKIE_SECURE ?? isProduction;

    const cookieOptions = {
      httpOnly: true,
      secure: isSecure,
      sameSite: env.COOKIE_SAME_SITE,
      path: '/',
    };

    res.clearCookie(env.COOKIE_NAME, cookieOptions);
    res.clearCookie(env.CSRF_COOKIE_NAME, {
      ...cookieOptions,
      httpOnly: false,
    });
  }

  /**
   * GET /api/v1/auth/csrf
   * Issues or refreshes a CSRF token cookie for the client.
   */
  getCsrfToken = (req: Request, res: Response): void => {
    const env = getEnv();
    const isProduction = env.NODE_ENV === 'production';
    const isSecure = env.COOKIE_SECURE ?? isProduction;

    let csrfToken = req.cookies[env.CSRF_COOKIE_NAME];
    if (!csrfToken || typeof csrfToken !== 'string' || csrfToken.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(csrfToken)) {
      csrfToken = crypto.randomBytes(32).toString('hex');
      res.cookie(env.CSRF_COOKIE_NAME, csrfToken, {
        httpOnly: false,
        secure: isSecure,
        sameSite: env.COOKIE_SAME_SITE,
        maxAge: 24 * 60 * 60 * 1000,
        path: '/',
      });
    }

    res.status(200).json({
      csrfToken,
    });
  };

  /**
   * POST /api/v1/auth/register
   * Public participant registration only.
   */
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body as RegisterSchemaInput;
      const { user, token } = await this.auth.registerParticipant(input);

      const csrfToken = this.setAuthCookies(res, token);

      res.status(201).json({
        message: 'Participant account registered successfully.',
        user,
        csrfToken,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/v1/auth/login
   * User login with email and password.
   */
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body as LoginSchemaInput;
      const { user, token } = await this.auth.login(input);

      const csrfToken = this.setAuthCookies(res, token);

      res.status(200).json({
        message: 'Login successful.',
        user,
        csrfToken,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/v1/auth/logout
   * Clears session and CSRF cookies.
   */
  logout = (_req: Request, res: Response): void => {
    this.clearAuthCookies(res);
    res.status(200).json({
      message: 'Logged out successfully.',
    });
  };

  /**
   * GET /api/v1/auth/me
   * Retrieves profile of currently authenticated user.
   */
  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const user = await this.auth.getCurrentUser(userId);

      res.status(200).json({
        user,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const authController = new AuthController();
