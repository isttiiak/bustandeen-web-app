import { z } from 'zod';

/** One error report from the app (utils/errorReporting.ts in the frontend). */
export const clientErrorSchema = z.object({
  body: z.object({
    kind: z.enum(['error', 'rejection', 'render']),
    message: z.string().max(1000),
    file: z
      .string()
      .max(200)
      .regex(/^\/[\w./-]*$/)
      .optional(),
    line: z.number().int().min(0).max(10_000_000).optional(),
    // The analytics-redacted page pattern ("/private" for private areas).
    route: z
      .string()
      .max(100)
      .regex(/^\/[\w/:.-]*$/),
    version: z.string().regex(/^\d{1,3}\.\d{1,3}\.\d{1,4}$/),
  }),
});
