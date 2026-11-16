import { z } from 'zod';
import { clientToday } from './clientDay.js';

export const connectSchema = z.object({
  body: z.object({
    code: z
      .string()
      .min(4)
      .max(32)
      .regex(/^[A-Za-z0-9_-]+$/),
  }),
});

export const socialSummarySchema = z.object({
  query: z.object({
    today: clientToday.optional(),
    timezoneOffset: z.coerce.number().min(-720).max(840).optional(),
  }),
  body: z.object({}).optional(),
});

export const setPrivacySchema = z.object({
  body: z
    .object({
      visibility: z.enum(['hidden', 'streaks', 'detail']).optional(),
      secret: z
        .object({
          salat: z.boolean().optional(),
          zikr: z.boolean().optional(),
          quran: z.boolean().optional(),
          fasting: z.boolean().optional(),
        })
        .strict()
        .optional(),
    })
    .strict()
    .refine((b) => b.visibility !== undefined || b.secret !== undefined, {
      message: 'Send visibility or secret',
    }),
});
