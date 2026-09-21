import { Request, Response, NextFunction } from 'express';
import { isAiEnabled } from '../services/ai.service.js';
import * as naseeh from '../services/naseehInsights.service.js';
import * as naseehPlan from '../services/naseehPlan.service.js';

/** These routes only compute from the user's own data, but "Naseeh is off"
 * should silence them too, not just the model-backed calls. */
async function guard(req: Request, res: Response): Promise<boolean> {
  if (await isAiEnabled(req.user.uid)) return true;
  res.status(403).json({ ok: false, error: 'Naseeh is turned off in Settings.' });
  return false;
}

export const patternInsightsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!(await guard(req, res))) return;
    const q = req.query as unknown as { today?: string; timezoneOffset: number; phrase: boolean };
    const result = await naseeh.getPatternInsights(req.user.uid, {
      today: q.today,
      timezoneOffset: q.timezoneOffset,
      phrase: q.phrase,
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const kazaPlanHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!(await guard(req, res))) return;
    const q = req.query as unknown as { today?: string; phrase: boolean };
    const result = await naseeh.getKazaPlan(req.user.uid, {
      today: q.today,
      phrase: q.phrase,
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const askHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!(await guard(req, res))) return;
    const b = req.body as { question: string; today?: string; timezoneOffset: number };
    const result = await naseeh.askAboutData(req.user.uid, b.question, {
      today: b.today,
      timezoneOffset: b.timezoneOffset,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const dataAnswerHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!(await guard(req, res))) return;
    const b = req.body as {
      query: naseeh.DataQueryId;
      period?: naseeh.DataPeriod;
      prayer?: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
      today?: string;
      timezoneOffset: number;
    };
    const result = await naseeh.runDataQuery(
      req.user.uid,
      { query: b.query, period: b.period, prayer: b.prayer },
      { today: b.today, timezoneOffset: b.timezoneOffset }
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const planHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!(await guard(req, res))) return;
    const q = req.query as unknown as { today?: string; timezoneOffset: number };
    const plan = await naseehPlan.getPlan(req.user.uid, {
      today: q.today,
      timezoneOffset: q.timezoneOffset,
    });
    res.json({ ok: true, ...plan });
  } catch (err) {
    next(err);
  }
};

export const acceptPlanHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!(await guard(req, res))) return;
    const b = req.body as {
      today?: string;
      timezoneOffset: number;
      targets?: naseehPlan.PlanAdjustment[];
    };
    const plan = await naseehPlan.acceptPlan(req.user.uid, {
      today: b.today,
      timezoneOffset: b.timezoneOffset,
      adjust: b.targets,
    });
    res.json({ ok: true, ...plan });
  } catch (err) {
    next(err);
  }
};
