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

export const replyFeedbackSchema = z.object({
  body: z.object({
    body: z.string().trim().min(1).max(4000),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});
