import { Request, Response, NextFunction } from 'express';
import * as aiService from '../services/ai.service.js';
import * as zikrService from '../services/zikr.service.js';
import * as naturalLogService from '../services/naturalLog.service.js';
import { PrayerId, PrayerLocation } from '../models/SalatLog.js';

export const parseHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { text } = req.body as { text: string };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- zikrTypes is a Mongoose subdocument array with a loosely-typed `.name`
    const types = (await zikrService.getZikrTypes(req.user.uid)) as any[];
    const typeNames = types.map((t) => String(t.name));
    const result = await aiService.parseNaturalLog(text, typeNames, req.user.uid);
    // Resolve each dhikr name against the user's own list, case-insensitively,
    // so "subhanallah" lands on their existing "SubhanAllah" instead of
    // splitting the count under a second spelling; a name with no match is
    // flagged so the preview can say a new dhikr will be created.
    const byLower = new Map(typeNames.map((n) => [n.toLowerCase(), n]));
    const zikr = result.zikr.map((z) => {
      const existing = byLower.get(z.typeName.toLowerCase());
      return existing ? { ...z, typeName: existing, isNew: false } : { ...z, isNew: true };
    });
    res.json({ ok: result.ok, salat: result.salat, zikr, quran: result.quran, day: result.day });
  } catch (err) {
    next(err);
  }
};

export const commitHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { salat, zikr, quranAyat, date, timezoneOffset } = req.body as {
      salat: Array<{ prayer: PrayerId; status: 'completed' | 'kaza'; location?: PrayerLocation }>;
      zikr: Array<{ typeName: string; count: number }>;
      quranAyat: number | null;
      date?: string;
      timezoneOffset?: number;
    };
    const result = await naturalLogService.commitNaturalLog(req.user.uid, {
      salat,
      zikr,
      quranAyat: quranAyat ?? null,
      date,
      timezoneOffset,
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
};
