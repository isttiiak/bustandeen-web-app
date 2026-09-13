import { Router } from 'express';
import { requireAdminAuth, requireOwnerAdmin } from '../middleware/auth.js';
import * as adminUsersController from '../controllers/adminUsers.controller.js';

const router = Router();

// Owner-only — sending a batch of real emails to real users is exactly the
// kind of "bulk/override" action reserved for istiak@bustandeen.com.
router.use(requireAdminAuth, requireOwnerAdmin);

router.get('/welcome-backfill', adminUsersController.welcomeBackfillStatusHandler);
router.post('/welcome-backfill', adminUsersController.welcomeBackfillSendHandler);

export default router;
