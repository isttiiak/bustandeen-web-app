import { Router } from 'express';
import { requireAdminAuth, requireServant } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createUpdateEmailSchema } from '../validation/updateEmail.schemas.js';
import * as updateEmailController from '../controllers/updateEmail.controller.js';

const router = Router();

// Servant-only bulk send (from ansar@bustandeen.com), same tier as the in-app
// broadcast banner it sits beside.
router.use(requireAdminAuth, requireServant);

router.get('/audience', updateEmailController.audienceHandler);
router.get('/', updateEmailController.listHandler);
router.post('/', validate(createUpdateEmailSchema), updateEmailController.createHandler);
router.get('/:id', updateEmailController.getHandler);
router.post('/:id/continue', updateEmailController.continueHandler);
router.post('/:id/retry-failed', updateEmailController.retryHandler);

export default router;
