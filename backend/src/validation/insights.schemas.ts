import { z } from 'zod';
import { clientToday } from './clientDay.js';

export const worshipCorrelationSchema = z.object({
  query: z.object({
    days: z.coerce.number().int().min(7).max(365).default(30),
    today: clientToday.optional(),
    timezoneOffset: z.coerce.number().min(-720).max(840).optional(),
  }),
});
