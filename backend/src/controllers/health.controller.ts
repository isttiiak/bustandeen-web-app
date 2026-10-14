import { Request, Response, NextFunction } from 'express';
import * as healthService from '../services/health.service.js';

/** GET /api/health/deep (LT-3): 200 when MongoDB answers, else 503, so an
 *  uptime monitor set to "URL becomes unavailable" alerts on a database outage. */
export const deepHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const db = await healthService.checkDatabase();
    res.setHeader('Cache-Control', 'no-store');
    res.status(db.ok ? 200 : 503).json({
      ok: db.ok,
      database: db.ok ? 'up' : 'down',
      latencyMs: db.latencyMs,
    });
  } catch (err) {
    next(err);
  }
};
