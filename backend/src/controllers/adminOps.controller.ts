import { Request, Response, NextFunction } from 'express';
import * as adminOpsService from '../services/adminOps.service.js';

export const healthHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const health = await adminOpsService.getOpsHealth();
    res.json({ ok: true, ...health });
  } catch (err) {
    next(err);
  }
};

export const rateLimitHitsHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const hits = await adminOpsService.getRateLimitSummary();
    res.json({ ok: true, hits });
  } catch (err) {
    next(err);
  }
};
