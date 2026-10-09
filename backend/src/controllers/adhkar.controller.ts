import { Request, Response, NextFunction } from 'express';
import * as adhkarService from '../services/adhkar.service.js';
import type { AdhkarPeriod } from '../models/AdhkarDay.js';

export const getDay = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const day = await adhkarService.getDay(req.user.uid, req.query['date'] as string);
    res.json({ ok: true, day });
  } catch (err) {
    next(err);
  }
};

export const markDone = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { date, period } = req.body as { date: string; period: AdhkarPeriod };
    const day = await adhkarService.markDone(req.user.uid, date, period);
    res.json({ ok: true, day });
  } catch (err) {
    next(err);
  }
};
