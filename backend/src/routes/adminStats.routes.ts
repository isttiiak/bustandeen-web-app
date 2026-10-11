import { Router } from 'express';
import { requireAdminAuth, requireServant } from '../middleware/auth.js';
import * as adminStatsController from '../controllers/adminStats.controller.js';

const router = Router();

// No requireDomain here on purpose — the SERVICE returns a different shape
// per role/domain, so any active admin can hit this endpoint safely; nothing
// cross-domain is ever computed for a request that shouldn't see it.
router.use(requireAdminAuth);

router.get('/overview', adminStatsController.overviewHandler);

// Daily activity (T4.6): people who opened the app and who logged each
// worship area per day, last 90 days. Counts only; Servant only, like the
// activity panel.
router.get('/daily', requireServant, adminStatsController.dailyHandler);

export default router;
