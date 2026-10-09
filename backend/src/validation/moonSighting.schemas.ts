import { z } from 'zod';

export const createMoonSightingSchema = z.object({
  body: z
    .object({
      country: z.string().regex(/^[A-Z]{2}$/, 'Use the two-letter country code, e.g. BD'),
      effectiveFrom: z.string().date(),
      offset: z.number().int().min(-1).max(1),
      note: z.string().trim().min(3).max(200),
      sourceUrl: z.string().url().max(300).startsWith('https://').optional(),
    })
    .strict(),
});

export const moonSightingIdSchema = z.object({
  params: z.object({ id: z.string().regex(/^[a-f0-9]{24}$/) }),
});
