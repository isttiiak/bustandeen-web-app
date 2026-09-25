import { Request, Response, NextFunction } from 'express';
import * as salatService from '../services/salat.service.js';
import * as salatDebtService from '../services/salatDebt.service.js';
import {
  PrayerId,
  PrayerStatus,
  PrayerLocation,
  NaflType,
  MissedReason,
  JamKind,
} from '../models/SalatLog.js';

export const getLog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const date = req.query['date'] as string | undefined;
    const today = req.query['today'] as string | undefined;
    await salatDebtService.ensureCaughtUp(req.user.uid, today);
    const log = await salatService.getLogReadOnly(req.user.uid, date);
    res.json({ ok: true, log });
  } catch (err) {
    next(err);
  }
};

export const updatePrayer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      prayer,
      status,
      date,
      location,
      tasbeeh,
      ayatulKursi,
      windowStart,
      windowEnd,
      missedReason,
      qasr,
      jam,
    } = req.body as {
      prayer: PrayerId;
      status: PrayerStatus;
      date?: string;
      location?: PrayerLocation;
      tasbeeh?: boolean;
      ayatulKursi?: boolean;
      windowStart?: string;
      windowEnd?: string;
      missedReason?: MissedReason;
      qasr?: boolean;
      jam?: JamKind | null;
    };
    const log = await salatService.updatePrayerStatus(
      req.user.uid,
      prayer,
      status,
      date,
      location,
      tasbeeh,
      ayatulKursi,
      windowStart,
      windowEnd,
      missedReason,
      { qasr, jam }
    );
    res.json({ ok: true, log });
  } catch (err) {
    next(err);
  }
};

export const updateNafl = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { completed, types, rakat, date } = req.body as {
      completed: boolean;
      types: NaflType[];
      rakat: number;
      date?: string;
    };
    const log = await salatService.updateNafl(req.user.uid, completed, types, rakat, date);
    res.json({ ok: true, log });
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
    const days = Number(req.query['days'] ?? 30);
    const today = req.query['today'] as string | undefined;
    await salatDebtService.ensureCaughtUp(req.user.uid, today);
    const logs = await salatService.getSalatHistory(req.user.uid, days);
    res.json({ ok: true, logs });
  } catch (err) {
    next(err);
  }
};

export const getAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const days = Number(req.query['days'] ?? 30);
    const today = req.query['today'] as string | undefined;
    await salatDebtService.ensureCaughtUp(req.user.uid, today);
    const User = (await import('../models/User.js')).default;
    const user = await User.findOne({ uid: req.user.uid })
      .select('salatResetDate createdAt')
      .lean();
    // Tracking began at account creation, or at the first log if that's
    // earlier (restored backups / back-dated entries) — see getSalatAnalytics.
    const SalatLog = (await import('../models/SalatLog.js')).default;
    const firstLog = await SalatLog.findOne({ userId: req.user.uid })
      .sort({ date: 1 })
      .select('date')
      .lean();
    const createdDate = user?.createdAt
      ? new Date(user.createdAt).toISOString().slice(0, 10)
      : undefined;
    const trackingStart =
      createdDate && firstLog?.date
        ? createdDate < firstLog.date
          ? createdDate
          : firstLog.date
        : (firstLog?.date ?? createdDate);
    const analytics = await salatService.getSalatAnalytics(
      req.user.uid,
      days,
      today,
      user?.salatResetDate,
      trackingStart
    );
    res.json({ ok: true, ...analytics });
  } catch (err) {
    next(err);
  }
};

export const getCorrelations = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const today = req.query['today'] as string | undefined;
    const rawOffset = Number(req.query['timezoneOffset']);
    const timezoneOffset = Number.isFinite(rawOffset) ? rawOffset : 0;
    const correlation = await salatService.getIshaFajrCorrelation(
      req.user.uid,
      timezoneOffset,
      today
    );
    res.json({ ok: true, ...correlation });
  } catch (err) {
    next(err);
  }
};

export const resetSalat = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const today = req.body?.today as string | undefined;
    const note = (req.body?.note as string | undefined) ?? '';
    const resetDate = today ?? salatService.todayDateString();
    const User = (await import('../models/User.js')).default;
    await User.updateOne(
      { uid: req.user.uid },
      {
        $set: { salatResetDate: resetDate },
        $push: { salatResetHistory: { date: resetDate, note, resetAt: new Date() } },
      }
    );
    res.json({ ok: true, resetDate });
  } catch (err) {
    next(err);
  }
};

export const getJourney = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const today = (req.query['today'] as string | undefined) ?? salatService.todayDateString();
    const User = (await import('../models/User.js')).default;
    const user = await User.findOne({ uid: req.user.uid })
      .select('createdAt salatResetHistory')
      .lean();
    if (!user) {
      res.status(404).json({ ok: false, error: 'User not found' });
      return;
    }
    const phases = await salatService.getSalatJourney(
      req.user.uid,
      user.createdAt,
      (user.salatResetHistory ?? []).map((e) => ({ date: e.date, note: e.note ?? '' })),
      today
    );
    res.json({ ok: true, phases });
  } catch (err) {
    next(err);
  }
};

export const getDebt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const today = req.query['today'] as string | undefined;
    await salatDebtService.ensureCaughtUp(req.user.uid, today);
    const debt = await salatDebtService.getDebtReadOnly(req.user.uid);
    res.json({ ok: true, ...debt });
  } catch (err) {
    next(err);
  }
};

export const resetDebt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const today = req.body?.today as string | undefined;
    const debt = await salatDebtService.resetDebt(req.user.uid, today);
    res.json({ ok: true, ...debt });
  } catch (err) {
    next(err);
  }
};

export const adjustDebt = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { prayer, delta, date } = req.body as { prayer: PrayerId; delta: number; date?: string };
    const debt = await salatDebtService.adjustDebt(req.user.uid, prayer, delta, date);
    res.json({ ok: true, ...debt });
  } catch (err) {
    next(err);
  }
};

export const setDebt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { prayer, count, date } = req.body as { prayer: PrayerId; count: number; date?: string };
    const debt = await salatDebtService.setDebt(req.user.uid, prayer, count, date);
    res.json({ ok: true, ...debt });
  } catch (err) {
    next(err);
  }
};

export const getDebtHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const days = Number(req.query['days'] ?? 30);
    const today = req.query['today'] as string | undefined;
    const weeks = await salatDebtService.getDebtHistory(req.user.uid, days, today);
    res.json({ ok: true, weeks });
  } catch (err) {
    next(err);
  }
};

export const getDebtInsights = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const insights = await salatDebtService.getKazaInsights(req.user.uid);
    res.json({ ok: true, ...insights });
  } catch (err) {
    next(err);
  }
};

export const deleteAllLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await salatService.deleteAllUserSalatLogs(req.user.uid);
    res.json({ ok: true, deletedCount: result.deletedCount });
  } catch (err) {
    next(err);
  }
};
