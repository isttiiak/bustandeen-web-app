import { z } from 'zod';
import { ADHKAR_PERIODS } from '../models/AdhkarDay.js';

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const getAdhkarDaySchema = z.object({
  query: z.object({ date: dateStr }),
  body: z.object({}).optional(),
});

export const markAdhkarDoneSchema = z.object({
  body: z.object({
    date: dateStr,
    period: z.enum(ADHKAR_PERIODS),
  }),
});
