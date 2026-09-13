import { Router } from 'express';
import { requireAuth, requireAdminEmail } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { verifyAdminPasswordSchema } from '../validation/adminAuth.schemas.js';
import * as adminAuthController from '../controllers/adminAuth.controller.js';

const router = Router();

// Only a Firebase-authenticated admin-allowlist account may even attempt the
// panel password — this is the SECOND factor, not a replacement for the
// email allowlist.
router.use(requireAuth, requireAdminEmail);

router.post(
  '/verify-password',
  validate(verifyAdminPasswordSchema),
  adminAuthController.verifyPasswordHandler
);

export default router;
