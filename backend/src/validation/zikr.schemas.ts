import { z } from 'zod';

// zikrType is used as a Mongoose Map key and in $inc dot-paths — names
// containing "." would corrupt the update path and "$" is a Mongo operator
// prefix. Block both. (Arabic, spaces, apostrophes etc. are all fine.)
const zikrTypeName = z
  .string()
  .min(1)
  .max(100)
  .refine((s) => !s.includes('.') && !s.startsWith('$'), {
    message: 'Name may not contain "." or start with "$"',
  });

// Bound a single increment so a stray client (or manual API call) can't
// corrupt lifetime stats with a giant number. Negative amounts are the
// counter's minus button — the service clamps day buckets at 0.
const amountField = z
  .number()
  .int()
  .min(-10_000)
  .max(10_000)
  .refine((a) => a !== 0, { message: 'amount may not be 0' })
  .default(1);

// Backfill window: today plus the two previous days — sized to the default
// 1-day grace period, with a little slack for timezones/clock skew. A user
// who raises graceDays beyond the default (see ZikrGoal.graceDays) can have
// their streak automatically bridge a longer gap once they resume tapping
// normally, but this static bound is NOT scaled to their setting — manually
// repairing ("Log Missed Counts") a day older than 2 days back is still
// refused even with a wider grace window. Widening this would need the
// per-user graceDays value available inside the schema, which Zod's static
// validation doesn't have; left as a known limitation rather than plumbing
// a DB lookup into request validation for an edge case.
const tsField = z
  .number()
  .optional()
  .refine(
    (ts) =>
      ts === undefined ||
      (ts > Date.now() - 3 * 24 * 60 * 60 * 1000 && ts < Date.now() + 24 * 60 * 60 * 1000),
    { message: 'ts out of allowed range (max 2 days back)' }
  );

const todayField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional();

// Real wall-clock moment of the tap (for time-of-day/session analytics) —
// same bounds as `ts` but not used for day-bucketing, so no Fajr-boundary
// backfill reasoning applies, just "recent enough to be real".
const realTsField = z
  .number()
  .optional()
  .refine(
    (ts) =>
      ts === undefined ||
      (ts > Date.now() - 3 * 24 * 60 * 60 * 1000 && ts < Date.now() + 24 * 60 * 60 * 1000),
    { message: 'realTs out of allowed range' }
  );

export const incrementSchema = z.object({
  body: z.object({
    zikrType: zikrTypeName,
    amount: amountField,
    ts: tsField,
    realTs: realTsField,
    timezoneOffset: z.number().min(-720).max(840).optional(),
    today: todayField,
  }),
});

export const batchIncrementSchema = z.object({
  body: z.object({
    increments: z
      .array(
        z.object({
          zikrType: zikrTypeName,
          amount: amountField,
          ts: tsField,
          realTs: realTsField,
          startTs: realTsField,
          untimedAmount: z.number().int().min(-10_000).max(10_000).optional(),
          manual: z.boolean().optional(),
        })
      )
      .min(1)
      .max(100),
    timezoneOffset: z.number().min(-720).max(840).optional(),
    today: todayField,
  }),
});

export const timeOfDaySchema = z.object({
  query: z.object({
    days: z.coerce.number().int().min(1).max(90).optional(),
    timezoneOffset: z.coerce.number().min(-720).max(840).optional(),
  }),
});

export const sessionsSchema = z.object({
  query: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    timezoneOffset: z.coerce.number().min(-720).max(840).optional(),
  }),
});

export const addZikrTypeSchema = z.object({
  body: z.object({
    name: zikrTypeName.transform((s) => s.trim()),
  }),
});

export const renameZikrTypeSchema = z.object({
  body: z.object({
    oldName: zikrTypeName.transform((s) => s.trim()),
    newName: zikrTypeName.transform((s) => s.trim()),
  }),
});
