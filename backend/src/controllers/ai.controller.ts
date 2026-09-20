import { Request, Response, NextFunction } from 'express';
import * as aiService from '../services/ai.service.js';

export const suggestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userSummary } = req.body as { userSummary?: string };
    const result = await aiService.getSuggestions(userSummary ?? '', req.user?.uid);
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const muhasabahHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { stats } = req.body as { stats?: Record<string, unknown> };
    const result = await aiService.getMuhasabahReport(stats ?? {}, req.user?.uid);
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const comebackHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { daysAway, bestStreak } = req.body as { daysAway: number; bestStreak?: number };
    const result = await aiService.getComebackNudge({ daysAway, bestStreak }, req.user?.uid);
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const streakCoachHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { event, streakDays, feature, bestStreak } = req.body as {
      event: 'milestone' | 'break';
      streakDays?: number;
      feature: string;
      bestStreak?: number;
    };
    const result = await aiService.getStreakCoaching(
      { event, streakDays, feature, bestStreak },
      req.user?.uid
    );
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const fastingCompanionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { period, fastType, dayNumber } = req.body as {
      period: 'morning' | 'evening';
      fastType: string;
      dayNumber?: number;
    };
    const result = await aiService.getFastingCompanion(
      { period, fastType, dayNumber },
      req.user?.uid
    );
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
};

// ── Bring-your-own Groq key ───────────────────────────────────────────────────

export const groqKeyStatusHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await aiService.getGroqKeyStatus(req.user.uid);
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const setGroqKeyHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { apiKey } = req.body as { apiKey: string };
    const result = await aiService.setGroqKey(req.user.uid, apiKey);
    if (!result.ok) {
      res.status(400).json({ ok: false, error: result.error });
      return;
    }
    res.json({ ok: true, hasOwnKey: result.hasOwnKey, setAt: result.setAt });
  } catch (err) {
    next(err);
  }
};

export const clearGroqKeyHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await aiService.setGroqKey(req.user.uid, null);
    res.json({ ok: true, hasOwnKey: result.hasOwnKey, setAt: result.setAt });
  } catch (err) {
    next(err);
  }
};
