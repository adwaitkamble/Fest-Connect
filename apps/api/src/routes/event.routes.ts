import { Router } from 'express';
import { eventController } from '../controllers/event.controller.js';
import { scheduleController } from '../controllers/schedule.controller.js';
import { authenticate, requireAuth, requireRole } from '../middleware/auth.middleware.js';
import { csrfProtection } from '../middleware/csrf.middleware.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.middleware.js';
import {
  eventQuerySchema,
  eventIdParamSchema,
  scheduleParamSchema,
  createEventSchema,
  updateEventSchema,
  createScheduleSchema,
  updateScheduleSchema,
} from '../schemas/event.schema.js';

export const eventRouter = Router();

// ==========================================
// 1. Public Event Discovery Routes
// ==========================================

// Paginated event list with filtering
eventRouter.get(
  '/',
  validateQuery(eventQuerySchema),
  eventController.list
);

// Event detail by ID with associated schedules
eventRouter.get(
  '/:id',
  validateParams(eventIdParamSchema),
  eventController.getById
);

// ==========================================
// 2. Protected Event Mutation Routes
// ==========================================

// Create event (Admin or Coordinator)
eventRouter.post(
  '/',
  authenticate,
  requireAuth,
  requireRole('ADMIN', 'COORDINATOR'),
  csrfProtection,
  validateBody(createEventSchema),
  eventController.create
);

// Update event (Admin or Coordinator of this event) - supports both PATCH and PUT
eventRouter.patch(
  '/:id',
  authenticate,
  requireAuth,
  requireRole('ADMIN', 'COORDINATOR'),
  csrfProtection,
  validateParams(eventIdParamSchema),
  validateBody(updateEventSchema),
  eventController.update
);

eventRouter.put(
  '/:id',
  authenticate,
  requireAuth,
  requireRole('ADMIN', 'COORDINATOR'),
  csrfProtection,
  validateParams(eventIdParamSchema),
  validateBody(updateEventSchema),
  eventController.update
);

// ==========================================
// 3. Event Schedules Routes
// ==========================================

// Public: Retrieve schedules for a specific event
eventRouter.get(
  '/:id/schedules',
  validateParams(eventIdParamSchema),
  scheduleController.list
);

// Protected: Create a schedule entry for an event
eventRouter.post(
  '/:id/schedules',
  authenticate,
  requireAuth,
  requireRole('ADMIN', 'COORDINATOR'),
  csrfProtection,
  validateParams(eventIdParamSchema),
  validateBody(createScheduleSchema),
  scheduleController.create
);

// Protected: Update a schedule entry for an event
eventRouter.patch(
  '/:id/schedules/:scheduleId',
  authenticate,
  requireAuth,
  requireRole('ADMIN', 'COORDINATOR'),
  csrfProtection,
  validateParams(scheduleParamSchema),
  validateBody(updateScheduleSchema),
  scheduleController.update
);
