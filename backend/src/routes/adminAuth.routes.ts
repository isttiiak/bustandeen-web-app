import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { adminLoginLimiter } from '../middleware/rateLimiter.js';
import { adminLoginSchema } from '../validation/adminAuth.schemas.js';
import * as adminAuthController from '../controllers/adminAuth.controller.js';

const router = Router();

// Public and unauthenticated on purpose — this IS the admin login, entirely
// separate from the app's Firebase user accounts. adminLoginLimiter is the
// only thing standing between this and a brute-force attempt.
router.post(
  '/login',
  adminLoginLimiter,
  validate(adminLoginSchema),
  adminAuthController.loginHandler
);

export default router;
