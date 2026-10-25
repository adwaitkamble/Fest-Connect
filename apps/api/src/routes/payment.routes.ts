import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller.js';
import { authenticate, requireAuth } from '../middleware/auth.middleware.js';
import { csrfProtection } from '../middleware/csrf.middleware.js';
import { validateBody, validateParams } from '../middleware/validate.middleware.js';
import {
  initiatePaymentSchema,
  paymentIdParamSchema,
} from '../schemas/payment.schema.js';

export const paymentRouter = Router();

// All payment routes require authentication
paymentRouter.use(authenticate, requireAuth);

// Initiate payment attempt (POST /api/v1/payments)
paymentRouter.post(
  '/',
  csrfProtection,
  validateBody(initiatePaymentSchema),
  paymentController.initiate
);

// Get payment attempt by ID (GET /api/v1/payments/:id)
paymentRouter.get(
  '/:id',
  validateParams(paymentIdParamSchema),
  paymentController.getById
);
