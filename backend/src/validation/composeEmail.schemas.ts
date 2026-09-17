import { z } from 'zod';

export const composeEmailSchema = z.object({
  body: z.object({
    to: z.string().trim().email().max(200),
    subject: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(10000),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});
