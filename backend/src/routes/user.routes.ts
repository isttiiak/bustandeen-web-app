import { Router } from 'express';
import { requireAuth, requireRecentAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as userController from '../controllers/user.controller.js';
import {
  updateUserSchema,
  linkGoogleSchema,
  unlinkGoogleSchema,
  setPrimaryEmailSchema,
  putPrefsSchema,
} from '../validation/user.schemas.js';
import { importLimiter, dataExportLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.get('/me', requireAuth, userController.getUserHandler);
router.patch('/me', requireAuth, validate(updateUserSchema), userController.updateUserHandler);

// Cross-device app preferences (theme-like settings that used to be
// localStorage-only). GET returns every stored key; PUT merges newest-wins.
router.get('/prefs', requireAuth, userController.getPrefsHandler);
router.put('/prefs', requireAuth, validate(putPrefsSchema), userController.putPrefsHandler);

// Linked Google account management
router.post(
  '/link-google',
  requireAuth,
  validate(linkGoogleSchema),
  userController.linkGoogleHandler
);
router.post(
  '/unlink-google',
  requireAuth,
  validate(unlinkGoogleSchema),
  userController.unlinkGoogleHandler
);
router.patch(
  '/primary-email',
  requireAuth,
  validate(setPrimaryEmailSchema),
  userController.setPrimaryEmailHandler
);

// GDPR: delete all user data + Firebase auth account. requireRecentAuth
// rejects a token whose original sign-in is more than a few minutes old —
// pairs with the re-auth prompt in Settings.tsx before this is ever called.
router.delete('/me', requireAuth, requireRecentAuth, userController.deleteAccountHandler);

// Full-account backup (one JSON of every domain) + merge-restore of that file
router.get('/export', requireAuth, userController.exportAllHandler);
// Read-only copy of everything held about the user, across every feature
router.get('/export/all', requireAuth, dataExportLimiter, userController.exportEverythingHandler);
// UID-keyed limiter after requireAuth — prevents backup-flood abuse
router.post('/import', requireAuth, importLimiter, userController.importAllHandler);

export default router;
