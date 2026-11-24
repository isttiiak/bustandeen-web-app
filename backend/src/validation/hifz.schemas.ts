import { z } from 'zod';
import { clientToday } from './clientDay.js';
import { ayahCountOf } from '../utils/surahAyahCounts.js';

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

// The day the app says it is: the same believable-"today" rule as every other tracker
// (a forged or wrong-clock date used to be taken as it came).
const day = clientToday.optional();

/** The ayah must exist: al-Fatiha has 7, so 1:8 is refused (the number alone allowed up to 286 anywhere). */
const realAyah = (v: { surah: number; ayah: number }) => v.ayah <= ayahCountOf(v.surah);
const realAyahMessage = { message: 'That surah does not have that ayah.', path: ['ayah'] };

export const hifzAddNextSchema = z.object({
  body: z.object({ date: day }).optional(),
});

export const hifzEntrySchema = z.object({
  body: z
    .object({
      surah: surahNum,
      ayah: ayahNum,
      date: day,
    })
    .refine(realAyah, realAyahMessage),
});

export const hifzReviewSchema = z.object({
  body: z
    .object({
      surah: surahNum,
      ayah: ayahNum,
      result: z.enum(['easy', 'hesitant', 'forgot']),
      date: day,
    })
    .refine(realAyah, realAyahMessage),
});

export const hifzProfileSchema = z.object({
  body: z.object({
    dailyNewTarget: z.number().int().min(0).max(200).optional(),
    dailyRevisionTarget: z.number().int().min(0).max(1000).optional(),
  }),
});
