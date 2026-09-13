import { Request, Response, NextFunction } from 'express';
import * as adminUsersService from '../services/adminUsers.service.js';

export const welcomeBackfillStatusHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const missing = await adminUsersService.countMissingWelcomeEmail();
    res.json({ ok: true, missing });
  } catch (err) {
    next(err);
  }
};

export const welcomeBackfillSendHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const limit = req.body?.limit ? Number(req.body.limit) : undefined;
    const result = await adminUsersService.sendWelcomeBackfill(limit);
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
};
