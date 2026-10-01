import { Request, Response, NextFunction } from 'express';
import * as fastingService from '../services/fasting.service.js';
import type { UpsertLogInput } from '../services/fasting.service.js';

export const getLog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const date = req.query['date'] as string | undefined;
    const log = await fastingService.getLog(req.user.uid, date);
    res.json({ ok: true, log }); // null when no fast is logged for that day
  } catch (err) {
    next(err);
  }
};

export const upsertLog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const log = await fastingService.upsertLog(req.user.uid, req.body as UpsertLogInput);
    res.json({ ok: true, log });
  } catch (err) {
    next(err);
  }
};

export const clearLog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const date = req.query['date'] as string;
    const result = await fastingService.clearLog(req.user.uid, date);
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const today = req.query['today'] as string | undefined;
    const summary = await fastingService.getSummary(req.user.uid, today);
    res.json({ ok: true, ...summary });
  } catch (err) {
    next(err);
  }
};

export const getHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const days = Number(req.query['days'] ?? 60);
    const today = req.query['today'] as string | undefined;
    const logs = await fastingService.getHistory(req.user.uid, days, today);
    res.json({ ok: true, logs });
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const profile = await fastingService.updateProfile(
      req.user.uid,
      req.body as fastingService.ProfileUpdateInput
    );
    res.json({ ok: true, profile });
  } catch (err) {
    next(err);
  }
};

export const addVow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, targetDays } = req.body as { title: string; targetDays: number };
    const profile = await fastingService.addVow(req.user.uid, title, targetDays);
    res.json({ ok: true, profile });
  } catch (err) {
    next(err);
  }
};

export const deleteVow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const vowId = req.params['vowId'] as string;
    const profile = await fastingService.deleteVow(req.user.uid, vowId);
    res.json({ ok: true, profile });
  } catch (err) {
    next(err);
  }
};

export const deleteAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await fastingService.deleteAllUserFastingData(req.user.uid);
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
};

const FASTING_CATEGORIES = ['qada', 'kaffarah', 'nadhr', 'voluntary', 'ramadan'] as const;

export const deleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const raw = String(req.params.category ?? '');
    if (!(FASTING_CATEGORIES as readonly string[]).includes(raw)) {
      res.status(400).json({ ok: false, error: 'Unknown fasting category' });
      return;
    }
    const result = await fastingService.deleteFastingCategory(
      req.user.uid,
      raw as fastingService.FastingCategory
    );
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
};
