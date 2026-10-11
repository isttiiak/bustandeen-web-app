import express, { Router } from 'express';
import { clientErrorLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import { clientErrorSchema } from '../validation/clientError.schemas.js';
import * as clientErrorController from '../controllers/clientError.controller.js';

const router = Router();

// Public (guests hit errors too): the app POSTs one report per distinct error.
// sendBeacon sends text/plain, which the app-wide JSON parser ignores, so this
// route parses it itself.
router.post(
  '/',
  clientErrorLimiter,
  express.json({ type: ['application/json', 'text/plain'], limit: '8kb' }),
  validate(clientErrorSchema),
  clientErrorController.reportHandler
);

export default router;
