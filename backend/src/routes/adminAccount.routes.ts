import { Router } from 'express';
import { requireAdminAuth, requireServant } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createAdminAccountSchema,
  setAdminAccountActiveSchema,
  setAdminAccountDomainSchema,
} from '../validation/adminAccount.schemas.js';
import * as adminAccountController from '../controllers/adminAccount.controller.js';

const router = Router();

// Servant-only, entire file — deciding who else gets into the admin panel
// is exactly the kind of critical/override operation reserved for the
// Servant tier.
router.use(requireAdminAuth, requireServant);

router.get('/', adminAccountController.listHandler);
router.post('/', validate(createAdminAccountSchema), adminAccountController.createHandler);
router.patch(
  '/:id/active',
  validate(setAdminAccountActiveSchema),
  adminAccountController.setActiveHandler
);
router.patch(
  '/:id/domain',
  validate(setAdminAccountDomainSchema),
  adminAccountController.setDomainHandler
);

export default router;
