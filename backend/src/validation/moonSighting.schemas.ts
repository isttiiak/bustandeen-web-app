import { z } from 'zod';

export const createMoonSightingSchema = z.object({
  body: z
    .object({
      country: z.string().regex(/^[A-Z]{2}$/, 'Use the two-letter country code, e.g. BD'),
      hijriYear: z.number().int().min(1400).max(1600),
      hijriMonth: z.number().int().min(1).max(12),
      startDate: z.string().date(),
      note: z.string().trim().min(3).max(200),
      sourceUrl: z.string().url().max(300).startsWith('https://').optional(),
    })
    .strict(),
});

export const moonSightingIdSchema = z.object({
  params: z.object({ id: z.string().regex(/^[a-f0-9]{24}$/) }),
});
