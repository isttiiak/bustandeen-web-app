import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { aiUserLimiter, aiChatLimiter } from '../middleware/rateLimiter.js';
import * as naseehController from '../controllers/naseeh.controller.js';
import {
  naseehPatternSchema,
  naseehKazaPlanSchema,
  naseehAskSchema,
  naseehDataAnswerSchema,
  naseehPlanSchema,
  naseehAcceptPlanSchema,
} from '../validation/naseeh.schemas.js';

const router = Router();

/** Only the model re-word (`phrase=1`) costs an AI request, so only that call
 * counts against the daily AI limit. The plain computed answer is free, which
 * means a client that hits the limit still gets its data. */
const limitWhenPhrasing = (req: Request, res: Response, next: NextFunction): void => {
  if (req.query['phrase'] === '1') {
    aiUserLimiter(req, res, next);
    return;
  }
  next();
};

router.get(
  '/pattern-insights',
  requireAuth,
  validate(naseehPatternSchema),
  limitWhenPhrasing,
  naseehController.patternInsightsHandler
);
router.get(
  '/kaza-plan',
  requireAuth,
  validate(naseehKazaPlanSchema),
  limitWhenPhrasing,
  naseehController.kazaPlanHandler
);

// Free-text question: one AI request to pick the lookup, so it has its own daily cap.
router.post(
  '/ask',
  requireAuth,
  aiChatLimiter,
  validate(naseehAskSchema),
  naseehController.askHandler
);
// Quick-question chips: a plain database lookup, no AI request at all.
router.post(
  '/data-answer',
  requireAuth,
  validate(naseehDataAnswerSchema),
  naseehController.dataAnswerHandler
);

// Weekly plan: worked out on the server from the user's own logs. No AI request
// is made (its numbers depend on rest days, which must never reach a model).
router.get('/plan', requireAuth, validate(naseehPlanSchema), naseehController.planHandler);
router.post(
  '/plan/accept',
  requireAuth,
  validate(naseehAcceptPlanSchema),
  naseehController.acceptPlanHandler
);

export default router;
