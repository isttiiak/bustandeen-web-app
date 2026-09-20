import { z } from 'zod';

export const updatePrayerSchema = z.object({
  body: z.object({
    prayer: z.enum(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']),
    status: z.enum(['completed', 'kaza', 'missed', 'pending']),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    location: z.enum(['home', 'mosque', 'jamat']).optional(),
    tasbeeh: z.boolean().optional(),
    ayatulKursi: z.boolean().optional(),
    // Client-computed prayer-window bounds (adhan library) — only meaningful
    // alongside status completed/kaza; ignored otherwise. ISO datetime.
    windowStart: z.string().datetime().optional(),
    windowEnd: z.string().datetime().optional(),
    // Optional, user-chosen context for a 'missed' tap — never required.
    missedReason: z.enum(['sleep', 'travel', 'forgot', 'busy', 'other']).optional(),
  }),
});

export const getSalatLogSchema = z.object({
  query: z.object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    // The user's Fajr-tracking day — the server clock runs UTC civil time
    // and is the wrong "today" for the missed-prayer rollover sweep.
    today: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  }),
  body: z.object({}).optional(),
});

export const getSalatDebtSchema = z.object({
  query: z.object({
    today: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  }),
  body: z.object({}).optional(),
});

export const salatCorrelationsSchema = z.object({
  query: z.object({
    today: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    timezoneOffset: z.coerce.number().int().min(-720).max(840).optional(),
  }),
  body: z.object({}).optional(),
});

export const salatHistorySchema = z.object({
  query: z.object({
    days: z.coerce.number().int().positive().max(3650).default(30),
    // The user's local calendar date — the server clock runs UTC and is the
    // wrong "today" for part of every day in non-UTC timezones.
    today: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  }),
  body: z.object({}).optional(),
});

const prayerIdEnum = z.enum(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']);

export const adjustSalatDebtSchema = z.object({
  body: z.object({
    prayer: prayerIdEnum,
    delta: z.number().int().min(-9999).max(9999),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  }),
});

export const setSalatDebtSchema = z.object({
  body: z.object({
    prayer: prayerIdEnum,
    count: z.number().int().min(0).max(9999),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  }),
});

export const resetSalatDebtSchema = z.object({
  body: z.object({
    today: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  }),
});

export const salatDebtHistorySchema = z.object({
  query: z.object({
    days: z.coerce.number().int().positive().max(3650).default(30),
    today: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  }),
  body: z.object({}).optional(),
});

export const resetSalatSchema = z.object({
  body: z.object({
    today: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    note: z
      .string()
      .max(120)
      .refine(
        (s) => !s.includes('.') && !s.startsWith('$'),
        'Note may not contain "." or start with "$"'
      )
      .optional(),
  }),
});

export const updateNaflSchema = z.object({
  body: z.object({
    completed: z.boolean(),
    types: z
      .array(
        z.enum([
          'tahajjud',
          'ishraq',
          'duha',
          'awwabin',
          'witr',
          'tahiyyat_wudu',
          'tahiyyat_masjid',
          'hajat',
          'istikharah',
          'tarawih',
        ])
      )
      .default([]),
    rakat: z.number().int().min(2).max(200).default(2),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  }),
});
