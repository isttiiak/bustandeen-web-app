import { z } from 'zod';
import { clientToday } from './clientDay.js';

export const analyticsQuerySchema = z.object({
  query: z.object({
    days: z.coerce.number().int().min(1).max(365).default(7),
    timezoneOffset: z.coerce.number().min(-720).max(840).optional(),
    today: clientToday.optional(),
  }),
});

/** Read routes that only take the client's day and clock offset. */
export const dayQuerySchema = z.object({
  query: z.object({
    timezoneOffset: z.coerce.number().min(-720).max(840).optional(),
    today: clientToday.optional(),
  }),
});

export const setGoalSchema = z.object({
  body: z.object({
    dailyTarget: z.number().int().min(1).max(100000),
    graceDays: z.number().int().min(0).max(3).optional(),
  }),
});
