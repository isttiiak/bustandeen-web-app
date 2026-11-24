import { Router } from 'express';
import { requireAdminAuth, requireAdminRecentAuth, requireServant } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { replyFeedbackSchema } from '../validation/feedback.schemas.js';
import * as adminMailboxController from '../controllers/adminMailbox.controller.js';

const router = Router();

// This is the founder's own inbox (istiak@bustandeen.com), not a shared
// review queue, so unlike the app-form feedback list it is Servant-only.
router.use(requireAdminAuth, requireServant);

router.get('/', adminMailboxController.listHandler);
router.post('/sync', adminMailboxController.syncHandler);
router.post('/:id/reply', validate(replyFeedbackSchema), adminMailboxController.replyHandler);
router.patch('/:id/archive', adminMailboxController.archiveHandler);
router.patch('/:id/mark-replied-external', adminMailboxController.markRepliedExternalHandler);
// Permanent: the Servant must have entered their password in the last few minutes
// (audit P2-8); the panel prompts for it and repeats the request.
router.delete('/:id', requireAdminRecentAuth, adminMailboxController.deleteHandler);

export default router;
