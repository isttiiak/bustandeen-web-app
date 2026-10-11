import { Router } from 'express';
import {
  requireAdminAuth,
  requireAdminIdentity,
  requireAdminRecentAuth,
} from '../middleware/auth.js';
import { adminMfaLimiter, adminSessionLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import { adminMfaCodeSchema } from '../validation/adminAccount.schemas.js';
import { passwordChangedHandler, sessionHandler } from '../controllers/adminAccount.controller.js';
import {
  confirmEnrolmentHandler,
  startEnrolmentHandler,
  verifyHandler,
} from '../controllers/adminMfa.controller.js';

const router = Router();

// Firebase sign-in itself happens client-side (a secondary Firebase app
// instance, isolated from the main app's own auth). This just confirms that
// identity is an active AdminAccount and reports which role it holds — the
// frontend calls it once right after sign-in.
// Also reports the second-factor state ('ok' / 'verify' / 'enroll'), so it
// runs before the MFA check.
router.get('/session', adminSessionLimiter, requireAdminIdentity, sessionHandler);

// Second factor (T1.4). The only other routes reachable without an MFA
// proof: they exist to get one. Enrolment needs a fresh password entry, so a
// long-lived stolen session can't attach its own authenticator.
router.post(
  '/mfa/enroll/start',
  requireAdminIdentity,
  adminMfaLimiter,
  requireAdminRecentAuth,
  startEnrolmentHandler
);
router.post(
  '/mfa/enroll/confirm',
  requireAdminIdentity,
  adminMfaLimiter,
  validate(adminMfaCodeSchema),
  confirmEnrolmentHandler
);
router.post(
  '/mfa/verify',
  requireAdminIdentity,
  adminMfaLimiter,
  validate(adminMfaCodeSchema),
  verifyHandler
);

// After a password change in the panel (which needs a fresh sign-in anyway):
// every other sign-in of this admin stops working.
router.post(
  '/password-changed',
  adminSessionLimiter,
  requireAdminAuth,
  requireAdminRecentAuth,
  passwordChangedHandler
);

export default router;
