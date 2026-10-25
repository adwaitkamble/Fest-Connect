import { Router } from 'express';
import { teamController } from '../controllers/team.controller.js';
import { authenticate, requireAuth } from '../middleware/auth.middleware.js';
import { csrfProtection } from '../middleware/csrf.middleware.js';
import { validateBody, validateParams } from '../middleware/validate.middleware.js';
import {
  createTeamSchema,
  addMemberSchema,
  teamIdParamSchema,
  memberParamSchema,
} from '../schemas/team.schema.js';

export const teamRouter = Router();

// All team routes require authentication
teamRouter.use(authenticate, requireAuth);

// List user's teams (or all teams for admin/coordinator)
teamRouter.get('/', teamController.list);

// Create new team (caller automatically becomes team leader)
teamRouter.post(
  '/',
  csrfProtection,
  validateBody(createTeamSchema),
  teamController.create
);

// Get team details with member roster and registrations
teamRouter.get(
  '/:id',
  validateParams(teamIdParamSchema),
  teamController.getById
);

// Add member to team (team leader or admin)
teamRouter.post(
  '/:id/members',
  csrfProtection,
  validateParams(teamIdParamSchema),
  validateBody(addMemberSchema),
  teamController.addMember
);

// Remove member from team (team leader, self-removal, or admin)
teamRouter.delete(
  '/:id/members/:participantId',
  csrfProtection,
  validateParams(memberParamSchema),
  teamController.removeMember
);
