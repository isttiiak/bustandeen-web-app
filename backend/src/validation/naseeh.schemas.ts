import { z } from 'zod';
import { PRAYER_IDS } from '../models/SalatLog.js';
import { DATA_QUERY_IDS, DATA_PERIODS } from '../services/naseehInsights.service.js';

const today = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timezoneOffset = z.coerce.number().int().min(-840).max(840);

// Query strings arrive as text: "phrase=1" asks for the model re-word, anything
// else (or nothing) returns the plain computed text.
const phraseFlag = z
  .enum(['0', '1'])
  .optional()
  .transform((v) => v === '1');

export const naseehPatternSchema = z.object({
  query: z.object({
    today: today.optional(),
    timezoneOffset: timezoneOffset.default(0),
    phrase: phraseFlag,
  }),
});

export const naseehKazaPlanSchema = z.object({
  query: z.object({
    today: today.optional(),
    phrase: phraseFlag,
  }),
});

export const naseehAskSchema = z.object({
  body: z.object({
    question: z.string().trim().min(2).max(200),
    today: today.optional(),
    timezoneOffset: timezoneOffset.default(0),
  }),
});

export const naseehDataAnswerSchema = z.object({
  body: z.object({
    query: z.enum(DATA_QUERY_IDS),
    period: z.enum(DATA_PERIODS).optional(),
    prayer: z.enum(PRAYER_IDS).optional(),
    today: today.optional(),
    timezoneOffset: timezoneOffset.default(0),
  }),
});

export const naseehPlanSchema = z.object({
  query: z.object({
    today: today.optional(),
    timezoneOffset: timezoneOffset.default(0),
  }),
});

export const naseehAcceptPlanSchema = z.object({
  body: z.object({
    today: today.optional(),
    timezoneOffset: timezoneOffset.default(0),
    // Optional tweaks to the suggested targets before accepting.
    targets: z
      .array(
        z.object({
          kind: z.enum(['zikr', 'quran', 'salat']),
          dailyAmount: z.number().int().min(1).max(100000).optional(),
          daysTarget: z.number().int().min(1).max(7).optional(),
        })
      )
      .max(3)
      .optional(),
  }),
});
