import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { submitFeedbackSchema } from '../validation/feedback.schemas.js';
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

export default router;
