import { Router } from 'express';
import { requireAdminAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createAnnouncementSchema } from '../validation/announcement.schemas.js';
import * as adminAnnouncementController from '../controllers/adminAnnouncement.controller.js';

const router = Router();

// Open to both Servant and Ansar accounts (the broadcast is a shared channel).
router.use(requireAdminAuth);

router.get('/', adminAnnouncementController.listHandler);
router.post('/', validate(createAnnouncementSchema), adminAnnouncementController.createHandler);
router.patch('/:id/deactivate', adminAnnouncementController.deactivateHandler);

export default router;
