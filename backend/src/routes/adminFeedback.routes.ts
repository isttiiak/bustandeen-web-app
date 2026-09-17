import { Router } from 'express';
import { requireAdminAuth, requireDomain, requireServant } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { replyFeedbackSchema } from '../validation/feedback.schemas.js';
import * as adminFeedbackController from '../controllers/adminFeedback.controller.js';

const router = Router();

// Feedback/Contact lives under the 'general' domain (ansar@bustandeen.com,
// same as zikr requests) — Servant always bypasses.
router.use(requireAdminAuth, requireDomain('general'));

router.get('/', adminFeedbackController.listHandler);
router.post('/:id/reply', validate(replyFeedbackSchema), adminFeedbackController.replyHandler);
router.patch('/:id/archive', adminFeedbackController.archiveHandler);
router.patch('/:id/mark-replied-external', adminFeedbackController.markRepliedExternalHandler);

// Delete is Servant-only per TODO-v3.md's "Servant: full CRUD, Ansar:
// read+reply, no delete" spec — unlike reply/archive above.
router.delete('/:id', requireServant, adminFeedbackController.deleteHandler);

export default router;
