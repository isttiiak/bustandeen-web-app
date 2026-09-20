import { z } from 'zod';

const zikrCategorySchema = z.enum([
  'tasbih',
  'istighfar',
  'salawat',
  'kalimat',
  'asma',
  'protection',
  'uncategorized',
]);

export const submitZikrRequestSchema = z.object({
  body: z.object({
    // Only the name/title is mandatory — the admin fills in/verifies the
    // rest during review.
    name: z.string().trim().min(1).max(100),
    arabic: z.string().trim().max(2000).optional(),
    meaning: z.string().trim().max(2000).optional(),
    source: z.string().trim().max(200).optional(),
    sourceUrl: z.string().trim().url().max(500).optional().or(z.literal('')),
    wantsAudio: z.boolean().optional(),
  }),
});

export const adminListZikrRequestsQuerySchema = z.object({
  query: z.object({
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
  }),
});

export const zikrRequestEmailDraftQuerySchema = z.object({
  query: z.object({
    type: z.enum(['approved', 'rejected']),
  }),
});

export const approveZikrRequestSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100),
    arabic: z.string().trim().min(1).max(2000),
    transliteration: z.string().trim().max(500).optional(),
    meaning: z.string().trim().min(1).max(2000),
    source: z.string().trim().min(1).max(200),
    sourceUrl: z.string().trim().url().max(500),
    grade: z.string().trim().max(200).optional(),
    virtue: z.string().trim().max(1000).optional(),
    category: zikrCategorySchema.optional(),
    audioAdded: z.boolean().optional(),
    emailBody: z.string().trim().min(1).max(5000),
  }),
});

export const rejectZikrRequestSchema = z.object({
  body: z.object({
    adminNote: z.string().trim().max(2000).optional(),
    emailBody: z.string().trim().max(5000).optional(),
  }),
});

export const updateLibraryItemCategorySchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    category: zikrCategorySchema,
  }),
});

export const updateLibraryItemSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    name: z.string().trim().min(1).max(100).optional(),
    arabic: z.string().trim().min(1).max(2000).optional(),
    transliteration: z.string().trim().max(500).optional(),
    meaning: z.string().trim().min(1).max(2000).optional(),
    source: z.string().trim().min(1).max(200).optional(),
    sourceUrl: z.string().trim().min(1).max(500).optional(),
    grade: z.string().trim().max(200).optional(),
    virtue: z.string().trim().max(1000).optional(),
  }),
});

export const libraryItemIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});
