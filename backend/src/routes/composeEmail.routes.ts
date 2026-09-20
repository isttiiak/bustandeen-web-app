import { Router } from 'express';
import { requireAdminAuth, requireServant } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { composeEmailSchema } from '../validation/composeEmail.schemas.js';
import * as composeEmailController from '../controllers/composeEmail.controller.js';

const router = Router();

// Servant-only free-form send — always from istiak@bustandeen.com, see
// composeEmail.service.ts for why this isn't domain-gated like other admin
// email actions.
router.use(requireAdminAuth, requireServant);

router.post('/send', validate(composeEmailSchema), composeEmailController.sendHandler);

export default router;
