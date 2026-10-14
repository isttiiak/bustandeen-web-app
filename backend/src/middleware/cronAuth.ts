import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';

/**
 * Vercel Cron calls each job with `Authorization: Bearer <CRON_SECRET>` once
 * the CRON_SECRET env var is set on the project. Anyone else gets 401, and
 * without the variable every cron route refuses (fails closed), so a job can
 * never be triggered by a stranger.
 */
export const requireCronSecret = (req: Request, res: Response, next: NextFunction): void => {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    res.status(503).json({ ok: false, error: 'Cron is not configured' });
    return;
  }
  const got = Buffer.from(req.get('authorization') ?? '');
  const want = Buffer.from(`Bearer ${secret}`);
  if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return;
  }
  next();
};
