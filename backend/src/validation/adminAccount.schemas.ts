import { z } from 'zod';

export const createAdminAccountSchema = z.object({
  body: z.object({
    email: z.string().trim().email().max(200),
    password: z.string().min(8).max(200),
    displayName: z.string().trim().max(100).optional(),
    role: z.enum(['servant', 'ansar']),
  }),
});

export const setAdminAccountActiveSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    active: z.boolean(),
  }),
});
