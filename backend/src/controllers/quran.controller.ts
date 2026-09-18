import { Request, Response, NextFunction } from 'express';
import * as quranService from '../services/quran.service.js';

export const read = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { date, pages, advancePosition } = req.body as {
      date: string;
      pages: number;
      advancePosition: boolean;
    };
    const result = await quranService.addReading(req.user.uid, date, pages, advancePosition);
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const readAyat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { date, count, surah, advanceKhatm, completedSurah } = req.body as {
      date: string;
      count: number;
      surah?: number;
      advanceKhatm?: boolean;
      completedSurah?: boolean;
    };
    const result = await quranService.addAyatReading(req.user.uid, {
      date,
      count,
      surah,
      advanceKhatm,
      completedSurah,
    });
    res.json({
      ok: true,
      khatmCompleted: result.khatmCompleted,
      currentAyah: result.profile.currentAyah,
      todayAyat: quranService.unitsOf(result.log),
    });
  } catch (err) {
    next(err);
  }
};

export const toggleBookmark = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { surah, ayah } = req.body as { surah: number; ayah: number };
    const bookmarks = await quranService.toggleBookmark(req.user.uid, surah, ayah);
    res.json({ ok: true, bookmarks });
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
    const days = Number(req.query.days) || 30;
    const today = typeof req.query.today === 'string' ? req.query.today : undefined;
    const history = await quranService.getHistory(req.user.uid, days, today);
    res.json({ ok: true, history });
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
    const summary = await quranService.getSummary(req.user.uid, today);
    res.json({ ok: true, ...summary });
  } catch (err) {
    next(err);
  }
};

export const setResume = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { surah, ayah } = req.body as { surah: number; ayah: number };
    await quranService.setResume(req.user.uid, surah, ayah);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

export const toggleDuaBookmark = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { duaId } = req.body as { duaId: string };
    const savedDuas = await quranService.toggleDuaBookmark(req.user.uid, duaId);
    res.json({ ok: true, savedDuas });
  } catch (err) {
    next(err);
  }
};

export const startKhatam = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const profile = await quranService.startKhatam(req.user.uid);
    res.json({ ok: true, khatamStartedAt: profile.khatamStartedAt });
  } catch (err) {
    next(err);
  }
};

export const resetKhatam = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await quranService.resetKhatam(req.user.uid);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

export const resetReading = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await quranService.resetReading(req.user.uid);
    res.json({ ok: true });
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
    const profile = await quranService.updateProfile(
      req.user.uid,
      req.body as quranService.QuranProfileUpdate
    );
    res.json({ ok: true, profile });
  } catch (err) {
    next(err);
  }
};

export const deleteAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await quranService.deleteAllUserQuranData(req.user.uid);
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
};

// POST /api/quran/session — periodic upsert of the in-progress reading session
export const saveSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      clientSessionId,
      date,
      startedAt,
      endedAt,
      activeDurationSec,
      ayahCount,
      pagesRead,
      surahs,
      source,
    } = req.body as {
      clientSessionId: string;
      date: string;
      startedAt: Date;
      endedAt: Date;
      activeDurationSec: number;
      ayahCount: number;
      pagesRead: number;
      surahs: number[];
      source: 'read' | 'listen';
    };
    const result = await quranService.saveReadingSession(req.user.uid, {
      clientSessionId,
      date,
      startedAt,
      endedAt,
      activeDurationSec,
      ayahCount,
      pagesRead,
      surahs,
      source,
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
};

// GET /api/quran/sessions?date= — reading + listening sessions for a day
export const getSessions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const date = req.query.date as string;
    const sessions = await quranService.getReadingSessionsForDay(req.user.uid, date);
    res.json({ ok: true, sessions });
  } catch (err) {
    next(err);
  }
};

// GET /api/quran/time-of-day?days=&timezoneOffset= — when engagement happens
export const getTimeOfDay = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const days = req.query.days !== undefined ? Number(req.query.days) : undefined;
    const timezoneOffset =
      req.query.timezoneOffset !== undefined ? Number(req.query.timezoneOffset) : undefined;
    const hours = await quranService.getQuranTimeOfDayDistribution(
      req.user.uid,
      days,
      timezoneOffset
    );
    res.json({ ok: true, hours });
  } catch (err) {
    next(err);
  }
};

// GET /api/quran/tafsir?surah=&ayah=&editionId= — authentic tafsir (quran.com)
export const getTafsir = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const surah = Number(req.query.surah);
    const ayah = Number(req.query.ayah);
    const editionId = Number(req.query.editionId);
    const result = await quranService.getTafsir(surah, ayah, editionId);
    res.json({ ok: true, ...result });
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status) {
      res.status(status).json({ ok: false, error: (err as Error).message });
      return;
    }
    next(err);
  }
};
