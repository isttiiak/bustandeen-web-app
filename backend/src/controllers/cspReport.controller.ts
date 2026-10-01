import type { Request, Response, NextFunction } from 'express';
import * as cspReportService from '../services/cspReport.service.js';

/** Always 204: a report endpoint gives the browser nothing back, and a
 *  malformed report is simply ignored. */
export const reportHandler = (req: Request, res: Response, next: NextFunction): void => {
  try {
    cspReportService.recordReports(req.body);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
