import { Router } from 'express';
import { requireAdminAuth, requireServant } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createMoonSightingSchema,
  moonSightingIdSchema,
} from '../validation/moonSighting.schemas.js';
import * as moonSightingController from '../controllers/moonSighting.controller.js';

const router = Router();

// Servant only (T4.1): a record shifts every Hijri date for a whole country.
router.use(requireAdminAuth, requireServant);

router.get('/', moonSightingController.listAdminHandler);
router.post('/', validate(createMoonSightingSchema), moonSightingController.createHandler);
router.patch(
  '/:id/deactivate',
  validate(moonSightingIdSchema),
  moonSightingController.deactivateHandler
);

export default router;
