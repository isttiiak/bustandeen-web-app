import { Router } from 'express';
import * as referenceCheckController from '../controllers/referenceCheck.controller.js';

const router = Router();

// GET /api/references/checks: manual checks on the reference map (public)
router.get('/checks', referenceCheckController.listPublicHandler);

export default router;
