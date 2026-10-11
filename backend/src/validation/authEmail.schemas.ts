import { z } from 'zod';

const lang = z.enum(['en', 'bn']).default('en');

export const passwordResetSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email().max(200),
    lang,
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const sendVerificationSchema = z.object({
  body: z.object({ lang }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});
