import { Router } from 'express';
import { requireAdminAuth, requireServant } from '../middleware/auth.js';
import * as adminAuditController from '../controllers/adminAudit.controller.js';

const router = Router();

// Servant-only — reviewing what an Ansar actually did is exactly the kind of
// oversight capability that shouldn't itself be visible to the Ansar being
// reviewed.
router.use(requireAdminAuth, requireServant);

router.get('/', adminAuditController.listHandler);

export default router;
