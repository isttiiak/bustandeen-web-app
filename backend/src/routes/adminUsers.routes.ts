import { Router } from 'express';
import { requireAdminAuth, requireAdminRecentAuth, requireServant } from '../middleware/auth.js';
import * as adminUsersController from '../controllers/adminUsers.controller.js';
import { validate } from '../middleware/validate.js';
import {
  adminUserDisableSchema,
  adminUserEmailSchema,
  adminUserParamSchema,
  welcomeBackfillSchema,
} from '../validation/adminUsers.schemas.js';

const router = Router();

// Owner-only — sending a batch of real emails to real users is exactly the
// kind of "bulk/override" action reserved for istiak@bustandeen.com.
router.use(requireAdminAuth, requireServant);

router.get('/', adminUsersController.listHandler);
router.get('/welcome-backfill', adminUsersController.welcomeBackfillStatusHandler);
router.post(
  '/welcome-backfill',
  validate(welcomeBackfillSchema),
  adminUsersController.welcomeBackfillSendHandler
);
router.get('/:uid', validate(adminUserParamSchema), adminUsersController.detailHandler);
router.get('/:uid/welcome-draft', adminUsersController.welcomeDraftHandler);
router.post(
  '/:uid/welcome-send',
  validate(adminUserEmailSchema),
  adminUsersController.welcomeSendHandler
);
router.get('/:uid/reengagement-draft', adminUsersController.reengagementDraftHandler);
router.post(
  '/:uid/reengagement-send',
  validate(adminUserEmailSchema),
  adminUsersController.reengagementSendHandler
);
router.post(
  '/:uid/custom-email',
  validate(adminUserEmailSchema),
  adminUsersController.customEmailSendHandler
);
router.post('/:uid/disable', validate(adminUserDisableSchema), adminUsersController.disableHandler);
router.post('/:uid/enable', adminUsersController.enableHandler);
// Single-UID only, explicit confirm required client-side — no bulk-delete
// variant, per TODO-v3.md's explicit note.
router.delete('/:uid', requireAdminRecentAuth, adminUsersController.deleteUserHandler);

export default router;
