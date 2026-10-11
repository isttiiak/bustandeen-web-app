import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  passwordResetEmailLimiter,
  passwordResetIpLimiter,
  verificationEmailLimiter,
} from '../middleware/rateLimiter.js';
import { passwordResetSchema, sendVerificationSchema } from '../validation/authEmail.schemas.js';

const router = Router();

// POST /api/auth/verify — verify Firebase token and upsert user
router.post('/verify', authController.verifyHandler);

// GET /api/auth/me is intentionally removed — use GET /api/user/me instead

// Account emails the app sends itself (branded link to /auth/action).
router.post(
  '/password-reset',
  passwordResetIpLimiter,
  validate(passwordResetSchema),
  passwordResetEmailLimiter,
  authController.passwordResetHandler
);
router.post(
  '/send-verification',
  requireAuth,
  verificationEmailLimiter,
  validate(sendVerificationSchema),
  authController.sendVerificationHandler
);

export default router;
