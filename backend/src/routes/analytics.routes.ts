import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as analyticsController from '../controllers/analytics.controller.js';
import { analyticsQuerySchema, setGoalSchema } from '../validation/analytics.schemas.js';

const router = Router();

router.get('/goal', requireAuth, analyticsController.getGoalHandler);
router.post('/goal', requireAuth, validate(setGoalSchema), analyticsController.setGoalHandler);
router.get('/streak', requireAuth, analyticsController.getStreakHandler);
router.post('/streak/pause', requireAuth, analyticsController.pauseStreakHandler);
router.post('/streak/resume', requireAuth, analyticsController.resumeStreakHandler);
router.post('/streak/check', requireAuth, analyticsController.checkStreakHandler);
router.get(
  '/',
  requireAuth,
  validate(analyticsQuerySchema),
  analyticsController.getAnalyticsHandler
);
router.get('/compare', requireAuth, analyticsController.compareAnalyticsHandler);

export default router;
