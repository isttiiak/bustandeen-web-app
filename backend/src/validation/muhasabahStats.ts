import { z } from 'zod';

/**
 * The only numbers the weekly muhāsabah report takes (MuhasabahReport.tsx sends
 * exactly these). Audit 2026-11-16 P2-5: the request used to take any JSON, which
 * was cut to 800 characters and put into the model's prompt, so it was a free-text
 * channel past sanitizeForPrompt. Now it is numbers and one date, nothing else.
 */
const MUHASABAH_NUMERIC_KEYS = [
  'zikrTotal7d',
  'zikrStreak',
  'salatStreak',
  'salatPct',
  'quranStreak',
  'quranAyatToday',
  'fastingThisMonth',
] as const;

const MAX_VALUE = 10_000_000;
const stat = z.number().finite().min(0).max(MAX_VALUE);

export const muhasabahStatsSchema = z.object({
  zikrTotal7d: stat.optional(),
  zikrStreak: stat.optional(),
  salatStreak: stat.optional(),
  salatPct: stat.optional(),
  quranStreak: stat.optional(),
  quranAyatToday: stat.optional(),
  fastingThisMonth: stat.optional(),
  trackingDay: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

const NUMERIC_KEY_SET: ReadonlySet<string> = new Set(MUHASABAH_NUMERIC_KEYS);
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** The same allowlist, applied again where the prompt is built (defence in depth: callers other than the route). */
export function muhasabahStatsForPrompt(stats: Record<string, unknown>): Record<string, unknown> {
  const kept: Array<[string, unknown]> = [];
  for (const [key, v] of Object.entries(stats)) {
    if (NUMERIC_KEY_SET.has(key)) {
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= MAX_VALUE) {
        kept.push([key, Math.round(v * 10) / 10]);
      }
    } else if (key === 'trackingDay' && typeof v === 'string' && DAY_RE.test(v)) {
      kept.push([key, v]);
    }
  }
  return Object.fromEntries(kept);
}
