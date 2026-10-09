import { z } from 'zod';

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
    today: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    timezoneOffset: z.coerce.number().min(-720).max(840).optional(),
  }),
  body: z.object({}).optional(),
});

export const setInvisibleSchema = z.object({
  body: z.object({ invisible: z.boolean() }),
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
