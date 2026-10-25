import { Router } from 'express';
import { registrationController } from '../controllers/registration.controller.js';
import { paymentController } from '../controllers/payment.controller.js';
import { passController } from '../controllers/pass.controller.js';
import { notificationController } from '../controllers/notification.controller.js';
import { authenticate, requireAuth } from '../middleware/auth.middleware.js';
import { csrfProtection } from '../middleware/csrf.middleware.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.middleware.js';
import {
  createRegistrationSchema,
  registrationIdParamSchema,
  updateRegistrationSchema,
  registrationQuerySchema,
} from '../schemas/team.schema.js';
import {
  initiatePaymentSchema,
  registrationPaymentParamSchema,
} from '../schemas/payment.schema.js';

export const registrationRouter = Router();

// All registration routes require authentication
registrationRouter.use(authenticate, requireAuth);

// Register a team for an event (team leader or admin)
registrationRouter.post(
  '/',
  csrfProtection,
  validateBody(createRegistrationSchema),
  registrationController.register
);

// List registrations (filtered by participant/coordinator role)
registrationRouter.get(
  '/',
  validateQuery(registrationQuerySchema),
  registrationController.list
);

// Get registration details
registrationRouter.get(
  '/:id',
  validateParams(registrationIdParamSchema),
  registrationController.getById
);

// Cancel registration (narrow allowed transition)
registrationRouter.patch(
  '/:id',
  csrfProtection,
  validateParams(registrationIdParamSchema),
  validateBody(updateRegistrationSchema),
  registrationController.cancel
);

// List payment attempts for a registration (GET /api/v1/registrations/:id/payments)
registrationRouter.get(
  '/:id/payments',
  validateParams(registrationPaymentParamSchema),
  paymentController.getByRegistrationId
);

// Initiate payment for a registration (POST /api/v1/registrations/:id/payments)
registrationRouter.post(
  '/:id/payments',
  csrfProtection,
  validateParams(registrationPaymentParamSchema),
  validateBody(initiatePaymentSchema),
  paymentController.initiate
);

// Get digital pass for a registration (GET /api/v1/registrations/:id/pass)
registrationRouter.get(
  '/:id/pass',
  validateParams(registrationIdParamSchema),
  passController.getRegistrationPass.bind(passController)
);

// Generate digital pass for a registration (POST /api/v1/registrations/:id/pass)
registrationRouter.post(
  '/:id/pass',
  csrfProtection,
  validateParams(registrationIdParamSchema),
  passController.generateRegistrationPass.bind(passController)
);

// Retrieve email delivery status for a registration (GET /api/v1/registrations/:id/notifications/email)
registrationRouter.get(
  '/:id/notifications/email',
  validateParams(registrationIdParamSchema),
  notificationController.getEmailNotificationStatus.bind(notificationController)
);

// Request or retry confirmation/pass email for a registration (POST /api/v1/registrations/:id/notifications/email)
registrationRouter.post(
  '/:id/notifications/email',
  csrfProtection,
  validateParams(registrationIdParamSchema),
  notificationController.sendOrRetryEmailNotification.bind(notificationController)
);



