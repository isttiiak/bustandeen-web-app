import { Request, Response, NextFunction } from 'express';
import * as cronService from '../services/cron.service.js';

/** GET /api/cron/email-check (Vercel Cron, daily). 502 when a sender fails. */
export const emailCheckHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await cronService.checkEmailSenders();
    await cronService.recordCronRun('email-check', result);
    res.status(result.ok ? 200 : 502).json({ ok: result.ok, detail: result.detail });
  } catch (err) {
    next(err);
  }
};

/** GET /api/cron/rebuild (Vercel Cron, monthly). A failed run answers 502 so
 *  it shows as failed in Vercel's cron list too. */
export const rebuildHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await cronService.triggerRebuild();
    await cronService.recordCronRun('rebuild', result);
    res.status(result.ok ? 200 : 502).json({ ok: result.ok, detail: result.detail });
  } catch (err) {
    next(err);
  }
};
