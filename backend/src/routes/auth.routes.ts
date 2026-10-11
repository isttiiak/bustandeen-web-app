import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { requireAuthAllowUnverified } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  passwordResetEmailLimiter,
  passwordResetIpLimiter,
  signupEmailLimiter,
  signupIpLimiter,
  verificationEmailLimiter,
} from '../middleware/rateLimiter.js';
import {
  passwordResetSchema,
  sendVerificationSchema,
  signupCheckSchema,
  signupCompleteSchema,
  signupStartSchema,
} from '../validation/authEmail.schemas.js';

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
// Accounts made before email-first sign-up may still be unverified.
router.post(
  '/send-verification',
  requireAuthAllowUnverified,
  verificationEmailLimiter,
  validate(sendVerificationSchema),
  authController.sendVerificationHandler
);

// Email-first sign-up: no account exists until the emailed link is used.
router.post(
  '/signup/start',
  signupIpLimiter,
  validate(signupStartSchema),
  signupEmailLimiter,
  authController.signupStartHandler
);
router.post('/signup/check', validate(signupCheckSchema), authController.signupCheckHandler);
router.post(
  '/signup/complete',
  validate(signupCompleteSchema),
  authController.signupCompleteHandler
);

export default router;
