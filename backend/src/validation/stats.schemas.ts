import { z } from 'zod';
import { STATS_AREAS } from '../services/statsReset.service.js';

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const resetStatsSchema = z.object({
  body: z.object({
    areas: z.array(z.enum(STATS_AREAS)).min(1).max(STATS_AREAS.length),
    today: day,
    note: z.string().max(120).optional(),
  }),
});

export const undoStatsResetSchema = z.object({
  body: z.object({ area: z.enum(STATS_AREAS) }),
});
