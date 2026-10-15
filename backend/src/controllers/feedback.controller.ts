import { Request, Response, NextFunction } from 'express';
import * as feedbackService from '../services/feedback.service.js';

export const submitHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, message, category, kind, botcheck } = req.body as {
      name: string;
      email: string;
      message: string;
      category: string[];
      kind: 'feedback' | 'contact';
      botcheck?: string;
    };
    // A filled honeypot means a bot — return success without doing anything,
    // so the bot gets no signal that it was caught.
    if (botcheck) {
      res.json({ ok: true });
      return;
    }
    const userId = req.user?.uid ?? null;
    await feedbackService.submitFeedback(
      { name, email, message, category, kind },
      req.ip ?? 'unknown',
      userId
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

/** POST /api/feedback/calendar: a country's calendar, in the Feedback inbox. */
export const calendarRequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { country, botcheck } = req.body as { country: string; botcheck?: string };
    if (botcheck) {
      res.json({ ok: true });
      return;
    }
    await feedbackService.submitCalendarRequest(
      country,
      req.ip ?? 'unknown',
      req.user?.uid ?? null
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

/** POST /api/feedback/language: lands in the same Feedback inbox. */
export const languageRequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { language, botcheck } = req.body as { language: string; botcheck?: string };
    if (botcheck) {
      res.json({ ok: true });
      return;
    }
    await feedbackService.submitLanguageRequest(
      language,
      req.ip ?? 'unknown',
      req.user?.uid ?? null
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
