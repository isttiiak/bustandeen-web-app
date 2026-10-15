import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import {
  submitFeedbackSchema,
  submitLanguageRequestSchema,
  submitCalendarRequestSchema,
} from '../validation/feedback.schemas.js';
import { feedbackSubmitLimiter } from '../middleware/rateLimiter.js';
import * as feedbackController from '../controllers/feedback.controller.js';

const router = Router();

// Public: guests and signed-in users can both send feedback/contact — no
// requireAuth.
router.post(
  '/',
  feedbackSubmitLimiter,
  validate(submitFeedbackSchema),
  feedbackController.submitHandler
);

// Public: a language request from the static pages' globe menu.
router.post(
  '/language',
  feedbackSubmitLimiter,
  validate(submitLanguageRequestSchema),
  feedbackController.languageRequestHandler
);

// Public: a country's calendar (government holidays, national days) from the
// Islamic calendar's download and settings.
router.post(
  '/calendar',
  feedbackSubmitLimiter,
  validate(submitCalendarRequestSchema),
  feedbackController.calendarRequestHandler
);

export default router;
