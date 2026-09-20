import { z } from 'zod';
import { FASTING_CATEGORIES, VOLUNTARY_KINDS } from '../models/FastingLog.js';

// FastingCompanion.tsx only ever sends `voluntaryKind ?? 'voluntary'` or
// `category ?? 'obligatory'` — lock the field to that real set rather than
// accepting arbitrary free text (which would land straight in the AI prompt).
const AI_FAST_TYPES = [...FASTING_CATEGORIES, ...VOLUNTARY_KINDS, 'obligatory'] as const;

export const aiSuggestSchema = z.object({
  body: z.object({
    userSummary: z.string().max(500).optional(),
  }),
});

export const aiMuhasabahSchema = z.object({
  body: z.object({
    stats: z.record(z.string(), z.unknown()).optional(),
  }),
});

export const aiComebackSchema = z.object({
  body: z.object({
    daysAway: z.number().int().min(1).max(3650),
    bestStreak: z.number().int().min(0).max(10000).optional(),
  }),
});

export const aiStreakCoachSchema = z.object({
  body: z.object({
    event: z.enum(['milestone', 'break']),
    streakDays: z.number().int().min(0).max(10000).optional(),
    feature: z.string().max(40),
    bestStreak: z.number().int().min(0).max(10000).optional(),
  }),
});

export const aiFastingCompanionSchema = z.object({
  body: z.object({
    period: z.enum(['morning', 'evening']),
    fastType: z.enum(AI_FAST_TYPES),
    dayNumber: z.number().int().min(1).max(60).optional(),
  }),
});

// Bring-your-own Groq key (Settings > AI). Loosely validated — Groq keys
// aren't a documented fixed format beyond the "gsk_" prefix; the real check
// is whether the key actually works, which happens on first use.
export const aiSetGroqKeySchema = z.object({
  body: z.object({
    apiKey: z.string().trim().min(10).max(200),
  }),
});
