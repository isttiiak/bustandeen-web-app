import { z } from 'zod';

export const verifyAdminPasswordSchema = z.object({
  body: z.object({
    password: z.string().min(1).max(200),
  }),
});
