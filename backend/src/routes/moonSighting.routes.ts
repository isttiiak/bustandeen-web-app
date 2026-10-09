import { Router } from 'express';
import * as moonSightingController from '../controllers/moonSighting.controller.js';

const router = Router();

// GET /api/calendar/moon-sighting — active national moon-sighting records (public)
router.get('/moon-sighting', moonSightingController.listPublicHandler);

export default router;
