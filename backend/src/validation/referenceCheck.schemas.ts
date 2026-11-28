import { z } from 'zod';
import { REFERENCE_CHECK_STATUSES } from '../models/ReferenceCheck.js';

/** Registry ids: "bukhari:1166", "quran:2:184", "fiqh:qasr-distance"… */
const refId = z
  .string()
  .max(80)
  .regex(/^[a-z][a-z0-9-]*:[a-z0-9:.-]+$/, 'Not a reference id');

export const saveReferenceCheckSchema = z.object({
  body: z
    .object({
      refId,
      status: z.enum(REFERENCE_CHECK_STATUSES as [string, ...string[]]),
      by: z.string().trim().min(1).max(80),
      date: z.string().date(),
      note: z.string().trim().max(1000).optional(),
    })
    .strict(),
});

export const referenceCheckIdSchema = z.object({
  params: z.object({ refId }),
});
