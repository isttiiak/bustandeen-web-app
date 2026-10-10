import { Router } from 'express';
import { requireAdminAuth, requireAdminRecentAuth } from '../middleware/auth.js';
import { adminSessionLimiter } from '../middleware/rateLimiter.js';
import { passwordChangedHandler, sessionHandler } from '../controllers/adminAccount.controller.js';

const router = Router();

// Firebase sign-in itself happens client-side (a secondary Firebase app
// instance, isolated from the main app's own auth). This just confirms that
// identity is an active AdminAccount and reports which role it holds — the
// frontend calls it once right after sign-in.
router.get('/session', adminSessionLimiter, requireAdminAuth, sessionHandler);

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
