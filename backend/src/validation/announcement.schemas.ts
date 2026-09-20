import { z } from 'zod';

export const createAnnouncementSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(2000),
    expiresAt: z.coerce.date().optional(),
  }),
});
