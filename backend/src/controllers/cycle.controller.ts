import { Request, Response, NextFunction } from 'express';
import * as cycleService from '../services/cycle.service.js';
import { getTodayString } from '../utils/timezone-flexible.js';

const dayOrToday = (raw: unknown): string =>
  typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : getTodayString();

export const getSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const today = dayOrToday(req.query.today);
    const summary = await cycleService.getSummary(req.user.uid, today);
    res.json({ ok: true, ...summary });
  } catch (err) {
    next(err);
  }
};

export const startCycle = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { date, type } = req.body as { date: string; type: 'hayd' | 'nifas' };
    const result = await cycleService.startCycle(req.user.uid, date, type);
    if (!result.ok) {
      res.status(400).json({ ok: false, error: result.error });
      return;
    }
    res.json({ ok: true, log: result.log });
  } catch (err) {
    next(err);
  }
};

export const endCycle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { date } = req.body as { date: string };
    const result = await cycleService.endCycle(req.user.uid, date);
    if (!result.ok) {
      res.status(400).json({ ok: false, error: result.error });
      return;
    }
    res.json({ ok: true, log: result.log });
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
    const { madhab } = req.body as { madhab: 'hanafi' | 'majority' };
    const profile = await cycleService.setMadhab(req.user.uid, madhab);
    res.json({ ok: true, profile: { madhab: profile.madhab } });
  } catch (err) {
    next(err);
  }
};

export const setPartnerSync = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { enabled, partnerUid } = req.body as { enabled: boolean; partnerUid?: string };
    const result = await cycleService.setPartnerSync(req.user.uid, { enabled, partnerUid });
    if (!result.ok) {
      res.status(400).json({ ok: false, error: result.error });
      return;
    }
    res.json({ ok: true, enabled: result.enabled, partnerUid: result.partnerUid });
  } catch (err) {
    next(err);
  }
};

export const setPregnancy = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { active, dueDate } = req.body as { active: boolean; dueDate?: string };
    const profile = await cycleService.setPregnancy(req.user.uid, active, dueDate);
    res.json({ ok: true, pregnancy: profile.pregnancy ?? { active: false } });
  } catch (err) {
    next(err);
  }
};

export const addPastCycle = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { startDate, endDate, type, today } = req.body as {
      startDate: string;
      endDate: string;
      type: 'hayd' | 'nifas';
      today: string;
    };
    const result = await cycleService.addPastCycle(req.user.uid, {
      startDate,
      endDate,
      type,
      today,
    });
    if (!result.ok) {
      res.status(400).json({ ok: false, error: result.error });
      return;
    }
    res.json({ ok: true, log: result.log });
  } catch (err) {
    next(err);
  }
};

export const upsertDay = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { date, flow, symptoms, moods, garden } = req.body as {
      date: string;
      flow?: 'light' | 'medium' | 'heavy' | null;
      symptoms?: string[];
      moods?: string[];
      garden?: string[];
    };
    const day = await cycleService.upsertDay(req.user.uid, { date, flow, symptoms, moods, garden });
    res.json({
      ok: true,
      day: {
        date: day.date,
        flow: day.flow,
        symptoms: day.symptoms,
        moods: day.moods,
        garden: day.garden,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const editLog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const logId = typeof req.params.logId === 'string' ? req.params.logId : '';
    const { startDate, endDate } = req.body as { startDate?: string; endDate?: string | null };
    const result = await cycleService.editCycleLog(req.user.uid, logId, { startDate, endDate });
    if (!result.ok) {
      res.status(400).json({ ok: false, error: result.error });
      return;
    }
    res.json({ ok: true, log: result.log });
  } catch (err) {
    next(err);
  }
};

export const deleteLog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const logId = typeof req.params.logId === 'string' ? req.params.logId : '';
    const removed = await cycleService.deleteLog(req.user.uid, logId);
    if (!removed) {
      res.status(404).json({ ok: false, error: 'Log not found' });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

export const deleteAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await cycleService.deleteAll(req.user.uid);
    res.json({ ok: true, message: 'All cycle data deleted' });
  } catch (err) {
    next(err);
  }
};

export const getBodyStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await cycleService.getBodyStats(req.user.uid);
    res.json({ ok: true, ...stats });
  } catch (err) {
    next(err);
  }
};

export const updateBodyStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { heightCm, weightKg } = req.body as { heightCm?: number; weightKg?: number };
    const stats = await cycleService.updateBodyStats(req.user.uid, { heightCm, weightKg });
    res.json({ ok: true, ...stats });
  } catch (err) {
    next(err);
  }
};
