import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as adhkarController from '../controllers/adhkar.controller.js';
import { getAdhkarDaySchema, markAdhkarDoneSchema } from '../validation/adhkar.schemas.js';

const router = Router();

// GET /api/adhkar/day?date=YYYY-MM-DD: which routines are done that tracking day
router.get('/day', requireAuth, validate(getAdhkarDaySchema), adhkarController.getDay);

// PUT /api/adhkar/day { date, period }: mark the morning or evening routine done
router.put('/day', requireAuth, validate(markAdhkarDoneSchema), adhkarController.markDone);

export default router;
