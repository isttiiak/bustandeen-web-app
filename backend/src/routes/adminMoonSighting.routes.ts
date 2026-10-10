import { Router } from 'express';
import { requireAdminAuth, requireDomain } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createMoonSightingSchema,
  moonSightingIdSchema,
} from '../validation/moonSighting.schemas.js';
import * as moonSightingController from '../controllers/moonSighting.controller.js';

const router = Router();

// A record shifts every Hijri date for a whole country (T4.1), so it was
// Servant only; U8 opened it to the 'general' Ansar too, so an Eid or
// Ramadan night never waits on one person. Every add and withdrawal is in the
// audit log with who did it; the sadaqah Ansar stays out.
router.use(requireAdminAuth, requireDomain('general'));

router.get('/', moonSightingController.listAdminHandler);
router.post('/', validate(createMoonSightingSchema), moonSightingController.createHandler);
router.patch(
  '/:id/deactivate',
  validate(moonSightingIdSchema),
  moonSightingController.deactivateHandler
);

export default router;
