import { z } from 'zod';
import { clientToday } from './clientDay.js';

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const surahNum = z.number().int().min(1).max(114);
const ayahNum = z.number().int().min(1).max(286);

export const hifzSummarySchema = z.object({
  query: z.object({ today: clientToday.optional() }),
  body: z.object({}).optional(),
});

export const hifzQueueSchema = z.object({
  query: z.object({ today: clientToday.optional() }),
  body: z.object({}).optional(),
});

export const hifzAddNextSchema = z.object({
  body: z.object({ date: dateStr.optional() }).optional(),
});

export const hifzEntrySchema = z.object({
  body: z.object({
    surah: surahNum,
    ayah: ayahNum,
    date: dateStr.optional(),
  }),
});

export const hifzReviewSchema = z.object({
  body: z.object({
    surah: surahNum,
    ayah: ayahNum,
    result: z.enum(['easy', 'hesitant', 'forgot']),
    date: dateStr.optional(),
  }),
});

export const hifzProfileSchema = z.object({
  body: z.object({
    dailyNewTarget: z.number().int().min(0).max(200).optional(),
    dailyRevisionTarget: z.number().int().min(0).max(1000).optional(),
  }),
});
