import { Router } from 'express';
import { requireAdminAuth, requireServant } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createAnnouncementSchema } from '../validation/announcement.schemas.js';
import * as adminAnnouncementController from '../controllers/adminAnnouncement.controller.js';

const router = Router();

// Servant-only — explicitly bulk/override-tier, never an Ansar capability
// per TODO-v3.md.
router.use(requireAdminAuth, requireServant);

router.get('/', adminAnnouncementController.listHandler);
router.post('/', validate(createAnnouncementSchema), adminAnnouncementController.createHandler);
router.patch('/:id/deactivate', adminAnnouncementController.deactivateHandler);

export default router;
