import { z } from 'zod';
import { clientToday } from './clientDay.js';
import { NUDGE_MESSAGE_MAX } from '../models/Nudge.js';

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

export const sendNudgeSchema = z.object({
  params: z.object({ friendUid: z.string().min(1).max(128) }),
  body: z
    .object({
      /** Optional short text shown with the nudge (plain text) */
      message: z.string().max(NUDGE_MESSAGE_MAX).optional(),
      today: clientToday.optional(),
      timezoneOffset: z.coerce.number().min(-720).max(840).optional(),
    })
    .strict(),
});

export const dismissNudgesSchema = z.object({
  body: z.object({ fromUids: z.array(z.string().min(1).max(128)).max(20).optional() }).strict(),
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
