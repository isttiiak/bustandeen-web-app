import { Router } from 'express';
import * as announcementController from '../controllers/announcement.controller.js';

const router = Router();

// Public: every visitor (signed in or not) sees the same active banner.
router.get('/active', announcementController.getActiveHandler);

export default router;
