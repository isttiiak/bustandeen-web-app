import type { Request, Response, NextFunction } from 'express';
import * as statsReset from '../services/statsReset.service.js';

export const getResetsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.json({ ok: true, resets: await statsReset.getResets(req.user.uid) });
  } catch (err) {
    next(err);
  }
};

export const resetHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { areas, today, note } = req.body as {
      areas: statsReset.StatsArea[];
      today: string;
      note?: string;
    };
    res.json({ ok: true, resets: await statsReset.resetAreas(req.user.uid, areas, today, note) });
  } catch (err) {
    next(err);
  }
};

export const undoHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { area } = req.body as { area: statsReset.StatsArea };
    res.json({ ok: true, resets: await statsReset.undoReset(req.user.uid, area) });
  } catch (err) {
    next(err);
  }
};
