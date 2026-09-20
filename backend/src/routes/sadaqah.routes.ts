import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { submitDonationSchema } from '../validation/sadaqah.schemas.js';
import { sadaqahSubmitLimiter, sadaqahVerifyLimiter } from '../middleware/rateLimiter.js';
import * as sadaqahController from '../controllers/sadaqah.controller.js';

const router = Router();

// Public: guests and signed-in users can both donate — no requireAuth.
router.post(
  '/submit',
  sadaqahSubmitLimiter,
  validate(submitDonationSchema),
  sadaqahController.submitHandler
);

router.get('/verify/:id', sadaqahVerifyLimiter, sadaqahController.verifyReceiptHandler);
router.get('/stats', sadaqahController.getStatsHandler);
router.get('/config', sadaqahController.getConfigHandler);

export default router;
