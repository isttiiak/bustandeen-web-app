import { Request, Response, NextFunction } from 'express';
import * as adminStatsService from '../services/adminStats.service.js';

export const overviewHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await adminStatsService.getOverview(req.admin!.role, req.admin!.ansarDomain);
    res.json({ ok: true, ...stats });
  } catch (err) {
    next(err);
  }
};
