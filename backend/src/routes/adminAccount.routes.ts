import { Router } from 'express';
import { requireAdminAuth, requireAdminRecentAuth, requireServant } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createAdminAccountSchema,
  setAdminAccountActiveSchema,
  setAdminAccountDomainSchema,
  adminAccountIdSchema,
  adminMfaPolicySchema,
} from '../validation/adminAccount.schemas.js';
import * as adminAccountController from '../controllers/adminAccount.controller.js';
import {
  getPolicyHandler,
  resetHandler as resetMfaHandler,
  setPolicyHandler,
} from '../controllers/adminMfa.controller.js';

const router = Router();

// Servant-only, entire file — deciding who else gets into the admin panel
// is exactly the kind of critical/override operation reserved for the
// Servant tier.
router.use(requireAdminAuth, requireServant);

router.get('/', adminAccountController.listHandler);

// Two-step sign-in switch for every admin (T1.4). Switching it needs a
// recent password entry (and, while it is on, the second factor too, like
// every route here).
router.get('/mfa-policy', getPolicyHandler);
router.put('/mfa-policy', requireAdminRecentAuth, validate(adminMfaPolicySchema), setPolicyHandler);
router.post(
  '/',
  requireAdminRecentAuth,
  validate(createAdminAccountSchema),
  adminAccountController.createHandler
);
router.patch(
  '/:id/active',
  requireAdminRecentAuth,
  validate(setAdminAccountActiveSchema),
  adminAccountController.setActiveHandler
);
router.patch(
  '/:id/domain',
  validate(setAdminAccountDomainSchema),
  adminAccountController.setDomainHandler
);

router.post(
  '/:id/password-reset',
  requireAdminRecentAuth,
  validate(adminAccountIdSchema),
  adminAccountController.sendPasswordResetHandler
);

// Lost authenticator: the admin sets it up again at their next sign-in.
router.post(
  '/:id/mfa-reset',
  requireAdminRecentAuth,
  validate(adminAccountIdSchema),
  resetMfaHandler
);

export default router;
