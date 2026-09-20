import { Router } from 'express';
import { requireAdminAuth } from '../middleware/auth.js';
import * as adminStatsController from '../controllers/adminStats.controller.js';

const router = Router();

// No requireDomain here on purpose — the SERVICE returns a different shape
// per role/domain, so any active admin can hit this endpoint safely; nothing
// cross-domain is ever computed for a request that shouldn't see it.
router.use(requireAdminAuth);

router.get('/overview', adminStatsController.overviewHandler);

export default router;
