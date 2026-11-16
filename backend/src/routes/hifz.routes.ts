import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idempotent } from '../middleware/idempotency.js';
import * as hifzController from '../controllers/hifz.controller.js';
import {
  hifzSummarySchema,
  hifzQueueSchema,
  hifzAddNextSchema,
  hifzEntrySchema,
  hifzReviewSchema,
  hifzProfileSchema,
} from '../validation/hifz.schemas.js';

const router = Router();

// GET /api/hifz/summary?today= — targets, streak, state totals, heatmap
router.get('/summary', requireAuth, validate(hifzSummarySchema), hifzController.getSummary);

// GET /api/hifz/queue?today= — today's due revisions + next-new-ayah cursor
router.get('/queue', requireAuth, validate(hifzQueueSchema), hifzController.getQueue);

// POST /api/hifz/next — start memorising the cursor's ayah, then advance it
router.post(
  '/next',
  requireAuth,
  validate(hifzAddNextSchema),
  idempotent(),
  hifzController.addNext
);

// POST /api/hifz/entries — start memorising a specific (surah, ayah)
router.post(
  '/entries',
  requireAuth,
  validate(hifzEntrySchema),
  idempotent(),
  hifzController.addEntry
);

// DELETE /api/hifz/entries — undo a mistaken add
router.delete('/entries', requireAuth, validate(hifzEntrySchema), hifzController.removeEntry);

// POST /api/hifz/review — self-assessment (easy/hesitant/forgot) for one ayah
router.post(
  '/review',
  requireAuth,
  validate(hifzReviewSchema),
  idempotent(),
  hifzController.review
);

// PATCH /api/hifz/profile — new/revision daily targets
router.patch('/profile', requireAuth, validate(hifzProfileSchema), hifzController.updateProfile);

// POST /api/hifz/cursor/reset — restart the "add next ayah" cursor at 1:1
router.post('/cursor/reset', requireAuth, hifzController.resetCursor);

// DELETE /api/hifz/all — wipe all Hifz data for the user
router.delete('/all', requireAuth, hifzController.deleteAll);

export default router;
