import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as analyticsController from '../controllers/analytics.controller.js';
import {
  analyticsQuerySchema,
  dayQuerySchema,
  setGoalSchema,
} from '../validation/analytics.schemas.js';

const router = Router();

router.get('/goal', requireAuth, analyticsController.getGoalHandler);
router.post('/goal', requireAuth, validate(setGoalSchema), analyticsController.setGoalHandler);
router.get('/streak', requireAuth, validate(dayQuerySchema), analyticsController.getStreakHandler);
router.post(
  '/streak/pause',
  requireAuth,
  validate(dayQuerySchema),
  analyticsController.pauseStreakHandler
);
router.post(
  '/streak/resume',
  requireAuth,
  validate(dayQuerySchema),
  analyticsController.resumeStreakHandler
);
router.get(
  '/',
  requireAuth,
  validate(analyticsQuerySchema),
  analyticsController.getAnalyticsHandler
);

export default router;
