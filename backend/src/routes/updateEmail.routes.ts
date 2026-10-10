import { Router } from 'express';
import { requireAdminAuth, requireDomain } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createUpdateEmailSchema } from '../validation/updateEmail.schemas.js';
import * as updateEmailController from '../controllers/updateEmail.controller.js';

const router = Router();

// The Servant and the 'general' Ansar, same as the in-app banner it sits
// beside (U8 S4): the audience lists users' names and emails. Always sent
// from ansar@bustandeen.com.
router.use(requireAdminAuth, requireDomain('general'));

router.get('/audience', updateEmailController.audienceHandler);
router.get('/', updateEmailController.listHandler);
router.post('/', validate(createUpdateEmailSchema), updateEmailController.createHandler);
router.get('/:id', updateEmailController.getHandler);
router.post('/:id/continue', updateEmailController.continueHandler);
router.post('/:id/retry-failed', updateEmailController.retryHandler);

export default router;
