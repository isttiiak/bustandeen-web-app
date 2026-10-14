import { Router } from 'express';
import { requireCronSecret } from '../middleware/cronAuth.js';
import * as cronController from '../controllers/cron.controller.js';

// Vercel Cron jobs (schedules in /vercel.json "crons"). Vercel calls them with
// GET and the CRON_SECRET bearer; nobody else can.
const router = Router();

router.use(requireCronSecret);

router.get('/rebuild', cronController.rebuildHandler);
router.get('/email-check', cronController.emailCheckHandler);

export default router;
