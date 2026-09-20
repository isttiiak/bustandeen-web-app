import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { aiUserLimiter } from '../middleware/rateLimiter.js';
import * as aiController from '../controllers/ai.controller.js';
import {
  aiSuggestSchema,
  aiMuhasabahSchema,
  aiComebackSchema,
  aiStreakCoachSchema,
  aiFastingCompanionSchema,
  aiSetGroqKeySchema,
} from '../validation/ai.schemas.js';

const router = Router();

// Encouragement & personalization only — never a source of religious evidence.
// aiUserLimiter runs after requireAuth (per-UID, 20/day) — the IP-based
// aiLimiter at the /api/ai mount point in app.ts is the outer, pre-auth guard.
router.post(
  '/suggest',
  requireAuth,
  aiUserLimiter,
  validate(aiSuggestSchema),
  aiController.suggestHandler
);
router.post(
  '/muhasabah',
  requireAuth,
  aiUserLimiter,
  validate(aiMuhasabahSchema),
  aiController.muhasabahHandler
);
router.post(
  '/comeback',
  requireAuth,
  aiUserLimiter,
  validate(aiComebackSchema),
  aiController.comebackHandler
);
router.post(
  '/streak-coaching',
  requireAuth,
  aiUserLimiter,
  validate(aiStreakCoachSchema),
  aiController.streakCoachHandler
);
router.post(
  '/fasting-companion',
  requireAuth,
  aiUserLimiter,
  validate(aiFastingCompanionSchema),
  aiController.fastingCompanionHandler
);

// Bring-your-own Groq key (Settings > AI) — a settings write, not a Groq
// call itself, so it doesn't sit behind aiUserLimiter.
router.get('/groq-key', requireAuth, aiController.groqKeyStatusHandler);
router.put('/groq-key', requireAuth, validate(aiSetGroqKeySchema), aiController.setGroqKeyHandler);
router.delete('/groq-key', requireAuth, aiController.clearGroqKeyHandler);

export default router;
