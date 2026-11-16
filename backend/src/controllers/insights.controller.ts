import { Request, Response, NextFunction } from 'express';
import * as insightsService from '../services/insights.service.js';

export const getWorshipCorrelation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const days = Number(req.query['days'] ?? 30);
    const today = req.query['today'] as string | undefined;
    // `!== undefined`, not truthiness: the validated offset is a number, and 0
    // (UTC) is a real offset, not "missing".
    const timezoneOffset =
      req.query['timezoneOffset'] !== undefined ? Number(req.query['timezoneOffset']) : undefined;
    const correlation = await insightsService.getWorshipCorrelation(
      req.user.uid,
      days,
      today,
      timezoneOffset
    );
    res.json({ ok: true, ...correlation });
  } catch (err) {
    next(err);
  }
};
