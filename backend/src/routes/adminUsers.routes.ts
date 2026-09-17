import { Router } from 'express';
import { requireAdminAuth, requireServant } from '../middleware/auth.js';
import * as adminUsersController from '../controllers/adminUsers.controller.js';

const router = Router();

// Owner-only — sending a batch of real emails to real users is exactly the
// kind of "bulk/override" action reserved for istiak@bustandeen.com.
router.use(requireAdminAuth, requireServant);

router.get('/', adminUsersController.listHandler);
router.get('/welcome-backfill', adminUsersController.welcomeBackfillStatusHandler);
router.post('/welcome-backfill', adminUsersController.welcomeBackfillSendHandler);
router.get('/:uid', adminUsersController.detailHandler);
router.post('/:uid/resend-welcome', adminUsersController.resendWelcomeHandler);
router.get('/:uid/reengagement-draft', adminUsersController.reengagementDraftHandler);
router.post('/:uid/reengagement-send', adminUsersController.reengagementSendHandler);
router.post('/:uid/disable', adminUsersController.disableHandler);
router.post('/:uid/enable', adminUsersController.enableHandler);
// Single-UID only, explicit confirm required client-side — no bulk-delete
// variant, per TODO-v3.md's explicit note.
router.delete('/:uid', adminUsersController.deleteUserHandler);

export default router;
