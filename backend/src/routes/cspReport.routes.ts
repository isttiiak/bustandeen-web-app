import express, { Router } from 'express';
import { cspReportLimiter } from '../middleware/rateLimiter.js';
import * as cspReportController from '../controllers/cspReport.controller.js';

const router = Router();

// Public: browsers POST Content-Security-Policy violation reports here (see
// the report-uri / report-to in /vercel.json). Browsers use their own content
// types, which the app-wide JSON parser ignores, so this route parses them.
router.post(
  '/',
  cspReportLimiter,
  express.json({
    type: ['application/csp-report', 'application/reports+json', 'application/json'],
    limit: '16kb',
  }),
  cspReportController.reportHandler
);

export default router;
