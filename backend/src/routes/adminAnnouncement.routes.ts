import { Router } from 'express';
import { requireAdminAuth, requireDomain } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createAnnouncementSchema } from '../validation/announcement.schemas.js';
import * as adminAnnouncementController from '../controllers/adminAnnouncement.controller.js';

const router = Router();

// The Servant and the 'general' Ansar (U8 S4): a banner reaches every user,
// which is not part of the sadaqah Ansar's area.
router.use(requireAdminAuth, requireDomain('general'));

router.get('/', adminAnnouncementController.listHandler);
router.post('/', validate(createAnnouncementSchema), adminAnnouncementController.createHandler);
router.patch('/:id/deactivate', adminAnnouncementController.deactivateHandler);

export default router;
