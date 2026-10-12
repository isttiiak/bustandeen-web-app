import { Request, Response, NextFunction } from 'express';
import * as analyticsService from '../services/analytics.service.js';
import * as streakService from '../services/streak.service.js';
import { DEFAULT_TIMEZONE_OFFSET } from '../utils/timezone-flexible.js';

export const getAnalyticsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      days = '7',
      timezoneOffset,
      today,
    } = req.query as { days?: string; timezoneOffset?: string; today?: string };
    const userOffset =
      timezoneOffset !== undefined ? parseInt(timezoneOffset) : DEFAULT_TIMEZONE_OFFSET;
    const data = await analyticsService.getAnalyticsData(
      req.user.uid,
      parseInt(days),
      userOffset,
      today
    );
    res.json({ ok: true, ...data });
  } catch (err) {
    next(err);
  }
};

export const getGoalHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const goal = await analyticsService.getGoal(req.user.uid);
    res.json({ ok: true, goal });
  } catch (err) {
    next(err);
  }
};

export const setGoalHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { dailyTarget, graceDays } = req.body as { dailyTarget: number; graceDays?: number };
    const goal = await analyticsService.setGoal(req.user.uid, dailyTarget, graceDays);
    res.json({ ok: true, goal });
  } catch (err) {
    next(err);
  }
};

export const getStreakHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { timezoneOffset, today } = req.query as { timezoneOffset?: string; today?: string };
    const userOffset =
      timezoneOffset !== undefined ? parseInt(timezoneOffset) : DEFAULT_TIMEZONE_OFFSET;
    const streak = await streakService.getStreak(req.user.uid, userOffset, today);
    res.json({ ok: true, streak });
  } catch (err) {
    next(err);
  }
};

export const pauseStreakHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { timezoneOffset, today } = req.query as { timezoneOffset?: string; today?: string };
    const userOffset =
      timezoneOffset !== undefined ? parseInt(timezoneOffset) : DEFAULT_TIMEZONE_OFFSET;
    const result = await streakService.pauseStreak(req.user.uid, userOffset, today);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const resumeStreakHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { timezoneOffset, today } = req.query as { timezoneOffset?: string; today?: string };
    const userOffset =
      timezoneOffset !== undefined ? parseInt(timezoneOffset) : DEFAULT_TIMEZONE_OFFSET;
    const result = await streakService.resumeStreak(req.user.uid, userOffset, today);
    if (!result) {
      res.status(404).json({ ok: false, error: 'Streak not found' });
      return;
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
};
