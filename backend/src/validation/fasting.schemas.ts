import { z } from 'zod';
import { clientToday } from './clientDay.js';
import { FASTING_CATEGORIES, VOLUNTARY_KINDS, FASTING_STATUSES } from '../models/FastingLog.js';

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const getFastingLogSchema = z.object({
  query: z.object({
    date: dateStr.optional(),
  }),
  body: z.object({}).optional(),
});

export const upsertFastingLogSchema = z.object({
  body: z
    .object({
      date: dateStr,
      category: z.enum(FASTING_CATEGORIES),
      voluntaryKind: z.enum(VOLUNTARY_KINDS).optional(),
      vowId: z.string().max(48).optional(),
      status: z.enum(FASTING_STATUSES),
      hijri: z.string().max(60).optional(),
      note: z.string().max(200).optional(),
      /** Ramadan tracker: did she/he pray tarawih this night? */
      tarawih: z.boolean().optional(),
    })
    .refine((b) => b.category !== 'nadhr' || !!b.vowId, {
      message: 'vowId is required for nadhr fasts',
    }),
});

export const clearFastingLogSchema = z.object({
  query: z.object({
    date: dateStr,
  }),
  body: z.object({}).optional(),
});

export const fastingSummarySchema = z.object({
  query: z.object({
    today: clientToday.optional(),
  }),
  body: z.object({}).optional(),
});

export const fastingHistorySchema = z.object({
  query: z.object({
    days: z.coerce.number().int().positive().max(400).default(60),
    today: clientToday.optional(),
  }),
  body: z.object({}).optional(),
});

export const updateFastingProfileSchema = z.object({
  body: z.object({
    qadaOwed: z.number().int().min(0).max(10_000).optional(),
    kaffarah: z
      .object({
        active: z.boolean(),
        targetDays: z.number().int().min(1).max(10_000),
        startDate: dateStr.optional(),
      })
      .optional(),
  }),
});

export const addVowSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(100).trim(),
    targetDays: z.number().int().min(1).max(10_000),
  }),
});
