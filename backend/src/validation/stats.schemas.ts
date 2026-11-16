import { z } from 'zod';
import { clientToday } from './clientDay.js';
import { STATS_AREAS } from '../services/statsReset.service.js';

export const resetStatsSchema = z.object({
  body: z.object({
    areas: z.array(z.enum(STATS_AREAS)).min(1).max(STATS_AREAS.length),
    today: clientToday,
    note: z.string().max(120).optional(),
  }),
});

export const undoStatsResetSchema = z.object({
  body: z.object({ area: z.enum(STATS_AREAS) }),
});
