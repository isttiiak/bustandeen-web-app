import { z } from 'zod';

export const createUpdateEmailSchema = z.object({
  body: z
    .object({
      subject: z.string().trim().min(1).max(200),
      body: z.string().trim().min(1).max(10000),
      // A group selection...
      audience: z.enum(['brother', 'sister', 'all']).optional(),
      notSetMode: z.enum(['include', 'skip', 'selected']).optional(),
      selectedUids: z.array(z.string().min(1).max(128)).max(2000).optional(),
      // ...or a custom list of addresses (special or test sends).
      customEmails: z.array(z.string().trim().email().max(200)).min(1).max(50).optional(),
    })
    .refine((b) => b.customEmails || (b.audience && b.notSetMode), {
      message: 'Choose a group or enter custom recipients',
    }),
});
