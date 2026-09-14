import { Router } from 'express';
import { requireAdminAuth } from '../middleware/auth.js';
import { adminSessionLimiter } from '../middleware/rateLimiter.js';
import { sessionHandler } from '../controllers/adminAccount.controller.js';

const router = Router();

// Firebase sign-in itself happens client-side (a secondary Firebase app
// instance, isolated from the main app's own auth). This just confirms that
// identity is an active AdminAccount and reports which role it holds — the
// frontend calls it once right after sign-in.
router.get('/session', adminSessionLimiter, requireAdminAuth, sessionHandler);

export default router;
