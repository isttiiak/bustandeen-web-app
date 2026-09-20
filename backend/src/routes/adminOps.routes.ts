import { Router } from 'express';
import { requireAdminAuth, requireServant } from '../middleware/auth.js';
import * as adminOpsController from '../controllers/adminOps.controller.js';

const router = Router();

// Servant-only — operational visibility, not a review-workflow surface.
router.use(requireAdminAuth, requireServant);

router.get('/health', adminOpsController.healthHandler);
router.get('/rate-limit-hits', adminOpsController.rateLimitHitsHandler);

export default router;
