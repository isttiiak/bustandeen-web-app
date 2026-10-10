import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as statsController from '../controllers/stats.controller.js';
import { resetStatsSchema, undoStatsResetSchema } from '../validation/stats.schemas.js';

// Stats fresh start (U7): per-area start dates, never a deletion.
const router = Router();

router.get('/resets', requireAuth, statsController.getResetsHandler);
router.post('/reset', requireAuth, validate(resetStatsSchema), statsController.resetHandler);
router.post(
  '/reset/undo',
  requireAuth,
  validate(undoStatsResetSchema),
  statsController.undoHandler
);

export default router;
