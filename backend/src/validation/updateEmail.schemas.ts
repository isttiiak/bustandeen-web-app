import { z } from 'zod';

export const createUpdateEmailSchema = z.object({
  body: z.object({
    subject: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(10000),
    audience: z.enum(['brother', 'sister', 'all']),
    notSetMode: z.enum(['include', 'skip', 'selected']),
    selectedUids: z.array(z.string().min(1).max(128)).max(2000).optional(),
  }),
});
