import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as zikrController from '../controllers/zikr.controller.js';
import * as zikrRequestController from '../controllers/zikrRequest.controller.js';
import {
  incrementSchema,
  batchIncrementSchema,
  addZikrTypeSchema,
  renameZikrTypeSchema,
  timeOfDaySchema,
  sessionsSchema,
} from '../validation/zikr.schemas.js';
import { submitZikrRequestSchema } from '../validation/zikrRequest.schemas.js';

const router = Router();

router.post('/increment', requireAuth, validate(incrementSchema), zikrController.incrementHandler);
router.post(
  '/increment/batch',
  requireAuth,
  validate(batchIncrementSchema),
  zikrController.batchIncrementHandler
);
router.get('/summary', requireAuth, zikrController.getSummaryHandler);
router.get(
  '/time-of-day',
  requireAuth,
  validate(timeOfDaySchema),
  zikrController.getTimeOfDayHandler
);
router.get('/sessions', requireAuth, validate(sessionsSchema), zikrController.getSessionsHandler);
router.get('/types', requireAuth, zikrController.getTypesHandler);
router.post('/types', requireAuth, validate(addZikrTypeSchema), zikrController.addTypeHandler);
router.patch(
  '/types/rename',
  requireAuth,
  validate(renameZikrTypeSchema),
  zikrController.renameTypeHandler
);
router.delete('/types/:name', requireAuth, zikrController.removeTypeHandler);

// POST /api/zikr/reset — zero counters + streak but keep daily history
router.post('/reset', requireAuth, zikrController.resetZikrCounters);
// DELETE /api/zikr/all — delete all zikr data for the authenticated user
router.delete('/all', requireAuth, zikrController.deleteAllZikrData);

// Community-suggested zikr/dua — submitted for admin review rather than
// added directly, so the library stays hadith-verified (see zikrRequest.service.ts).
router.post(
  '/requests',
  requireAuth,
  validate(submitZikrRequestSchema),
  zikrRequestController.submitHandler
);
router.get('/requests/mine', requireAuth, zikrRequestController.listMineHandler);
router.post('/requests/:id/ack', requireAuth, zikrRequestController.ackHandler);
// Public — admin-approved suggestions merged into the curated library display.
router.get('/library', zikrRequestController.libraryHandler);

export default router;
