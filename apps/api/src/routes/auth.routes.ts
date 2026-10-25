import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { registerSchema, loginSchema } from '../schemas/auth.schema.js';
import { authenticate, requireAuth } from '../middleware/auth.middleware.js';
import { csrfProtection } from '../middleware/csrf.middleware.js';

export const authRouter = Router();

// Public CSRF token initialization
authRouter.get('/csrf', authController.getCsrfToken);

// Public authentication routes
authRouter.post(
  '/register',
  csrfProtection,
  validateBody(registerSchema),
  authController.register
);

authRouter.post(
  '/login',
  csrfProtection,
  validateBody(loginSchema),
  authController.login
);

authRouter.post(
  '/logout',
  csrfProtection,
  authController.logout
);

// Protected routes
authRouter.get(
  '/me',
  authenticate,
  requireAuth,
  authController.me
);
