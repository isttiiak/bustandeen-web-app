import { z } from 'zod';

export const composeEmailSchema = z.object({
  body: z
    .object({
      // Threaded reply to an existing feedback/contact submission — `to` and
      // `subject` are derived server-side from that document so the reply
      // lands in its one thread, so neither is accepted from the client here.
      feedbackId: z.string().trim().min(1).optional(),
      // Freeform send to an arbitrary address — required unless feedbackId is set.
      to: z.string().trim().email().max(200).optional(),
      subject: z.string().trim().min(1).max(200).optional(),
      body: z.string().trim().min(1).max(10000),
    })
    .refine((v) => v.feedbackId || (v.to && v.subject), {
      message: 'Either feedbackId, or both to and subject, are required',
    }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});
