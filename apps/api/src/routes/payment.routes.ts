import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller.js';
import { authenticate, requireAuth } from '../middleware/auth.middleware.js';
import { csrfProtection } from '../middleware/csrf.middleware.js';
import { validateBody, validateParams } from '../middleware/validate.middleware.js';
import {
  initiatePaymentSchema,
  paymentIdParamSchema,
  razorpayOrderSchema,
  razorpayVerifySchema,
} from '../schemas/payment.schema.js';

export const paymentRouter = Router();

// Public/authenticated gateway config (GET /api/v1/payments/config)
paymentRouter.get('/config', paymentController.getConfig);

// All mutation & record payment routes require authentication
paymentRouter.use(authenticate, requireAuth);

// Create Razorpay Order (POST /api/v1/payments/razorpay/order)
paymentRouter.post(
  '/razorpay/order',
  csrfProtection,
  validateBody(razorpayOrderSchema),
  paymentController.createRazorpayOrder
);

// Verify Razorpay Payment (POST /api/v1/payments/razorpay/verify)
paymentRouter.post(
  '/razorpay/verify',
  csrfProtection,
  validateBody(razorpayVerifySchema),
  paymentController.verifyRazorpayPayment
);

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

