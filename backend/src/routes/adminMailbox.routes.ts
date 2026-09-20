import { Router } from 'express';
import { requireAdminAuth, requireServant } from '../middleware/auth.js';
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
router.delete('/:id', adminMailboxController.deleteHandler);

export default router;
