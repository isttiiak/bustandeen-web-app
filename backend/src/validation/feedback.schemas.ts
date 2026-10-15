import { z } from 'zod';

export const submitFeedbackSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(200),
    email: z.string().trim().email().max(200),
    message: z.string().trim().min(10).max(4000),
    category: z.array(z.string().trim().max(100)).max(10).default([]),
    kind: z.enum(['feedback', 'contact']),
    // Honeypot — a human never fills this in. Checked in the controller, not
    // enforced by the schema (a filled botcheck should be silently dropped,
    // not surfaced as a validation error a real bot could learn from).
    botcheck: z.string().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

/** "Request a language" from the globe menu on the static pages (2026-10-15):
 * only the language's name, no account, name or email. */
export const LANGUAGE_REQUEST_CATEGORY = 'Language request';
export const submitLanguageRequestSchema = z.object({
  body: z.object({
    language: z.string().trim().min(2).max(60),
    botcheck: z.string().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

/** "Request your country's calendar" from the Islamic calendar (2026-10-16):
 * only the country (ISO 3166-1 alpha-2), no account, name or email. */
export const CALENDAR_REQUEST_CATEGORY = 'Calendar request';
export const submitCalendarRequestSchema = z.object({
  body: z.object({
    country: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/),
    botcheck: z.string().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const replyFeedbackSchema = z.object({
  body: z.object({
    body: z.string().trim().min(1).max(4000),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});
