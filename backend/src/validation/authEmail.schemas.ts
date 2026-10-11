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

const signupToken = z.string().trim().min(20).max(200);

export const signupStartSchema = z.object({
  body: z.object({
    firstName: z.string().trim().max(60).default(''),
    lastName: z.string().trim().max(60).default(''),
    email: z.string().trim().toLowerCase().email().max(200),
    gender: z.enum(['male', 'female']),
    lang,
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const signupCheckSchema = z.object({
  body: z.object({ token: signupToken }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const signupCompleteSchema = z.object({
  body: z.object({ token: signupToken, password: z.string().min(6).max(128) }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});
