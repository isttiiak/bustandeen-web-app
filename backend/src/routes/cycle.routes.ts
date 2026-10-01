import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as cycleController from '../controllers/cycle.controller.js';
import {
  startCycleSchema,
  endCycleSchema,
  cycleProfileSchema,
  cycleDaySchema,
  pastCycleSchema,
  editCycleLogSchema,
  partnerSyncSchema,
  pregnancySchema,
  bodyStatsSchema,
} from '../validation/cycle.schemas.js';
import { idempotent } from '../middleware/idempotency.js';

const router = Router();

// Offline-outbox dedupe (audit T2.3). Cycle responses are never copied into
// the dedupe record (they would sit there unencrypted): a replay gets { ok }.
const noBody = idempotent({ storeBody: false });

// GET /api/cycle/summary?today= — status + prediction + recent logs
router.get('/summary', requireAuth, cycleController.getSummary);

// POST /api/cycle/start — begin a hayd/nifas episode
router.post('/start', requireAuth, validate(startCycleSchema), noBody, cycleController.startCycle);

// POST /api/cycle/end — end the active episode
router.post('/end', requireAuth, validate(endCycleSchema), noBody, cycleController.endCycle);

// POST /api/cycle/logs — backfill a completed past episode (history import)
router.post('/logs', requireAuth, validate(pastCycleSchema), noBody, cycleController.addPastCycle);

// PUT /api/cycle/day — per-day wellness note (flow/symptoms/mood)
router.put('/day', requireAuth, validate(cycleDaySchema), cycleController.upsertDay);

// PATCH /api/cycle/profile — madhab setting
router.patch('/profile', requireAuth, validate(cycleProfileSchema), cycleController.updateProfile);

// PATCH /api/cycle/partner-sync — opt-in/out of sharing cycle status
// (on-cycle boolean only) with one existing friend; see setPartnerSync's doc.
router.patch(
  '/partner-sync',
  requireAuth,
  validate(partnerSyncSchema),
  cycleController.setPartnerSync
);

// PATCH /api/cycle/pregnancy — pregnancy status + due date (suspends hayd
// predictions only; does not touch salat/fasting exemption logic)
router.patch('/pregnancy', requireAuth, validate(pregnancySchema), cycleController.setPregnancy);

// DELETE /api/cycle/logs/:logId — remove one episode
// PATCH /api/cycle/logs/:logId — edit dates, or endDate:null to REOPEN the
// most recent episode ("I'm not done yet"); daily notes are never touched
router.patch('/logs/:logId', requireAuth, validate(editCycleLogSchema), cycleController.editLog);

router.delete('/logs/:logId', requireAuth, cycleController.deleteLog);

// GET /api/cycle/body-stats — encrypted height/weight + computed BMI
router.get('/body-stats', requireAuth, cycleController.getBodyStats);

// PATCH /api/cycle/body-stats — save height and/or weight (encrypted at rest)
router.patch(
  '/body-stats',
  requireAuth,
  validate(bodyStatsSchema),
  cycleController.updateBodyStats
);

// DELETE /api/cycle/all — remove everything (Settings "Your data")
router.delete('/all', requireAuth, cycleController.deleteAll);

export default router;
