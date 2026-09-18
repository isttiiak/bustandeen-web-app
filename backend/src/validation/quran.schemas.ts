import { z } from 'zod';

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const quranReadSchema = z.object({
  body: z.object({
    date: dateStr,
    // Half pages allowed; bounded so a typo can't corrupt stats
    pages: z.number().min(0.5).max(604),
    advancePosition: z.boolean().default(true),
  }),
});

export const quranSummarySchema = z.object({
  query: z.object({
    today: dateStr.optional(),
  }),
  body: z.object({}).optional(),
});

export const quranProfileSchema = z.object({
  body: z.object({
    dailyGoalPages: z.number().int().min(1).max(604).optional(),
    currentPage: z.number().int().min(0).max(603).optional(),
    // 0 = no goal (opt-in habit, Istiak's spec)
    dailyGoalAyat: z.number().int().min(0).max(6236).optional(),
    currentAyah: z.number().int().min(0).max(6235).optional(),
    // Display/reading preferences — cross-device sync (ranges mirror
    // frontend/src/utils/quranPrefs.ts's FONT_RANGES exactly).
    arabicFont: z.enum(['clean', 'naskh', 'uthmani']).optional(),
    fontArabicPx: z.number().int().min(22).max(52).optional(),
    fontTranslationPx: z.number().int().min(12).max(26).optional(),
    fontTranslitPx: z.number().int().min(11).max(24).optional(),
    fontTafsirPx: z.number().int().min(13).max(28).optional(),
    translitEnabled: z.boolean().optional(),
    listenCountsAsAyat: z.boolean().optional(),
    reciterId: z.string().trim().min(1).max(40).optional(),
    translations: z.array(z.string().trim().min(1).max(20)).max(2).optional(),
  }),
});

export const quranResumeSchema = z.object({
  body: z.object({
    surah: z.number().int().min(1).max(114),
    // ayah 0 clears the resume position for that surah
    ayah: z.number().int().min(0).max(286),
  }),
});

export const quranDuaBookmarkSchema = z.object({
  body: z.object({
    duaId: z
      .string()
      .min(1)
      .max(60)
      .regex(/^[a-z0-9-]+$/),
  }),
});

export const quranReadAyatSchema = z.object({
  body: z.object({
    date: dateStr,
    // count 0 is allowed only to carry a pure surah-completion signal
    count: z.number().int().min(0).max(700),
    surah: z.number().int().min(1).max(114).optional(),
    advanceKhatm: z.boolean().default(false),
    /** Set when this reading reached the LAST ayah of `surah` — credits a
     * completion toward the "top surahs" list. */
    completedSurah: z.boolean().default(false),
  }),
});

export const quranBookmarkSchema = z.object({
  body: z.object({
    surah: z.number().int().min(1).max(114),
    ayah: z.number().int().min(1).max(286),
  }),
});

export const quranHistorySchema = z.object({
  query: z.object({
    days: z.coerce.number().int().min(1).max(365).default(30),
    today: dateStr.optional(),
  }),
  body: z.object({}).optional(),
});

export const quranTafsirSchema = z.object({
  query: z.object({
    surah: z.coerce.number().int().min(1).max(114),
    ayah: z.coerce.number().int().min(1).max(286),
    editionId: z.coerce.number().int(),
  }),
  body: z.object({}).optional(),
});

// POST /api/quran/session — periodic upsert of the in-progress reading
// session (idempotent by clientSessionId; safe to retry on flaky networks).
export const quranSessionSaveSchema = z.object({
  body: z.object({
    clientSessionId: z
      .string()
      .min(8)
      .max(64)
      .regex(/^[a-zA-Z0-9-]+$/),
    date: dateStr,
    startedAt: z.coerce.date(),
    endedAt: z.coerce.date(),
    // Bounded generously above the client's own idle/tafsir caps — this is a
    // last-resort backstop, not the primary defense (that's clamping to
    // wall-clock elapsed time in the service).
    activeDurationSec: z
      .number()
      .int()
      .min(0)
      .max(6 * 3600),
    ayahCount: z.number().int().min(0).max(7000).default(0),
    pagesRead: z.number().int().min(0).max(700).default(0),
    surahs: z.array(z.number().int().min(1).max(114)).max(50).default([]),
    source: z.enum(['read', 'listen']).default('read'),
  }),
});

export const quranSessionsQuerySchema = z.object({
  query: z.object({
    date: dateStr,
  }),
  body: z.object({}).optional(),
});

export const quranTimeOfDaySchema = z.object({
  query: z.object({
    days: z.coerce.number().int().min(1).max(90).optional(),
    timezoneOffset: z.coerce.number().min(-720).max(840).optional(),
  }),
  body: z.object({}).optional(),
});
