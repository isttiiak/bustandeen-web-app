import { z } from 'zod';

/** Firebase uids are at most 128 characters. */
const uidParams = z.object({ uid: z.string().trim().min(1).max(128) });

/** One email to one user: welcome, re-engagement or free-form. */
export const adminUserEmailSchema = z.object({
  params: uidParams,
  body: z.object({
    subject: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(10000),
  }),
});

export const adminUserDisableSchema = z.object({
  params: uidParams,
  body: z.object({ reason: z.string().trim().max(500).optional() }).optional(),
});

export const adminUserParamSchema = z.object({ params: uidParams });

/** Sends go out one at a time inside one serverless request (30 s limit), so
 *  a call sends a small batch and the caller repeats until none remain. */
export const WELCOME_BACKFILL_MAX = 20;

export const welcomeBackfillSchema = z.object({
  body: z
    .object({ limit: z.coerce.number().int().min(1).max(WELCOME_BACKFILL_MAX).optional() })
    .optional(),
});
