import { Router } from 'express';
import { passController } from '../controllers/pass.controller.js';
import { authenticate, requireAuth } from '../middleware/auth.middleware.js';
import { validateBody, validateParams } from '../middleware/validate.middleware.js';
import { verifyPassSchema, passParamSchema } from '../schemas/pass.schema.js';

const router = Router();

// All pass routes require authenticated session
router.use(authenticate, requireAuth);

/**
 * POST /api/v1/passes/validate
 * Server-side pass and QR validation
 */
router.post(
  '/validate',
  validateBody(verifyPassSchema),
  passController.verifyPass.bind(passController)
);

/**
 * POST /api/v1/passes/verify
 * Server-side pass verification by pass_number or qr_code (alias)
 */
router.post(
  '/verify',
  validateBody(verifyPassSchema),
  passController.verifyPass.bind(passController)
);

/**
 * GET /api/v1/passes/:id
 * Retrieve digital pass by pass ID
 */
router.get(
  '/:id',
  validateParams(passParamSchema),
  passController.getPassById.bind(passController)
);

export default router;
