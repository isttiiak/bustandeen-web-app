import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as fastingController from '../controllers/fasting.controller.js';
import {
  getFastingLogSchema,
  upsertFastingLogSchema,
  clearFastingLogSchema,
  fastingSummarySchema,
  fastingHistorySchema,
  updateFastingProfileSchema,
  addVowSchema,
} from '../validation/fasting.schemas.js';

const router = Router();

// GET /api/fasting?date=YYYY-MM-DD — day log (null when none)
router.get('/', requireAuth, validate(getFastingLogSchema), fastingController.getLog);

// PUT /api/fasting/log — upsert the day's fast
router.put('/log', requireAuth, validate(upsertFastingLogSchema), fastingController.upsertLog);

// DELETE /api/fasting/log?date= — clear the day's fast
router.delete('/log', requireAuth, validate(clearFastingLogSchema), fastingController.clearLog);

// GET /api/fasting/summary?today= — profile + derived progress + recent logs
router.get('/summary', requireAuth, validate(fastingSummarySchema), fastingController.getSummary);

// GET /api/fasting/history?days=&today=
router.get('/history', requireAuth, validate(fastingHistorySchema), fastingController.getHistory);

// PATCH /api/fasting/profile — qada owed / kaffarah settings
router.patch(
  '/profile',
  requireAuth,
  validate(updateFastingProfileSchema),
  fastingController.updateProfile
);

// Nadhr vows
router.post('/vows', requireAuth, validate(addVowSchema), fastingController.addVow);
router.delete('/vows/:vowId', requireAuth, fastingController.deleteVow);

// DELETE /api/fasting/all — wipe all fasting data for the user
router.delete('/all', requireAuth, fastingController.deleteAll);

// DELETE /api/fasting/category/:category — one obligation's logs + its
// profile bookkeeping (qada owed / kaffarah settings / vows), rest untouched
router.delete('/category/:category', requireAuth, fastingController.deleteCategory);

export default router;
