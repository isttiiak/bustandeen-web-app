import { Request, Response, NextFunction } from 'express';
import * as hifzService from '../services/hifz.service.js';
import { runIdempotent } from '../middleware/idempotency.js';
import { HifzResult } from '../models/HifzEntry.js';

export const getSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const today = req.query['today'] as string | undefined;
    const summary = await hifzService.getSummary(req.user.uid, today);
    res.json({ ok: true, ...summary });
  } catch (err) {
    next(err);
  }
};

export const getQueue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const today = req.query['today'] as string | undefined;
    const queue = await hifzService.getQueue(req.user.uid, today);
    res.json({ ok: true, ...queue });
  } catch (err) {
    next(err);
  }
};

export const addNext = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { date } = (req.body ?? {}) as { date?: string };
    const body = await runIdempotent(res, async () => ({
      ok: true,
      ...(await hifzService.addNext(req.user.uid, date)),
    }));
    res.json(body);
  } catch (err) {
    next(err);
  }
};

export const addEntry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { surah, ayah, date } = req.body as { surah: number; ayah: number; date?: string };
    const body = await runIdempotent(res, async () => ({
      ok: true,
      ...(await hifzService.addEntry(req.user.uid, surah, ayah, date)),
    }));
    res.json(body);
  } catch (err) {
    next(err);
  }
};

export const removeEntry = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { surah, ayah } = req.body as { surah: number; ayah: number };
    const removed = await hifzService.removeEntry(req.user.uid, surah, ayah);
    res.json({ ok: true, removed });
  } catch (err) {
    next(err);
  }
};

export const review = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { surah, ayah, result, date } = req.body as {
      surah: number;
      ayah: number;
      result: HifzResult;
      date?: string;
    };
    const body = await runIdempotent(res, async () => {
      const out = await hifzService.review(req.user.uid, surah, ayah, result, date);
      return { ok: true, entry: out.entry };
    });
    res.json(body);
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status) {
      res.status(status).json({ ok: false, error: (err as Error).message });
      return;
    }
    next(err);
  }
};

export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const profile = await hifzService.updateProfile(
      req.user.uid,
      req.body as hifzService.HifzProfileUpdate
    );
    res.json({ ok: true, profile });
  } catch (err) {
    next(err);
  }
};

export const resetCursor = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const profile = await hifzService.resetCursor(req.user.uid);
    res.json({ ok: true, profile });
  } catch (err) {
    next(err);
  }
};

export const deleteAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await hifzService.deleteAllUserHifzData(req.user.uid);
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
};
