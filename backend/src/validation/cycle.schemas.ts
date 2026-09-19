import { z } from 'zod';

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const startCycleSchema = z.object({
  body: z.object({
    date: dateField,
    type: z.enum(['hayd', 'nifas']).default('hayd'),
  }),
});

export const endCycleSchema = z.object({
  body: z.object({
    date: dateField,
  }),
});

export const cycleProfileSchema = z.object({
  body: z.object({
    madhab: z.enum(['hanafi', 'majority']),
  }),
});

export const pregnancySchema = z.object({
  body: z.object({
    active: z.boolean(),
    dueDate: dateField.optional(),
  }),
});

export const pastCycleSchema = z.object({
  body: z.object({
    startDate: dateField,
    endDate: dateField,
    type: z.enum(['hayd', 'nifas']).default('hayd'),
    today: dateField,
  }),
});

export const editCycleLogSchema = z.object({
  body: z
    .object({
      startDate: dateField.optional(),
      // null = REOPEN the episode ("I'm not done yet")
      endDate: dateField.nullable().optional(),
    })
    .refine((b) => b.startDate !== undefined || b.endDate !== undefined, {
      message: 'Nothing to change',
    }),
});

export const partnerSyncSchema = z.object({
  body: z.object({
    enabled: z.boolean(),
    partnerUid: z.string().min(1).max(128).optional(),
  }),
});

export const bodyStatsSchema = z.object({
  body: z.object({
    heightCm: z.number().min(50).max(300).optional(),
    weightKg: z.number().min(20).max(500).optional(),
  }),
});

export const cycleDaySchema = z.object({
  body: z.object({
    date: dateField,
    flow: z.enum(['light', 'medium', 'heavy']).nullable().optional(),
    symptoms: z
      .array(
        z.enum([
          'cramps',
          'headache',
          'fatigue',
          'nausea',
          'backache',
          'bloating',
          'tenderness',
          'insomnia',
        ])
      )
      .max(8)
      .optional(),
    moods: z
      .array(z.enum(['calm', 'happy', 'low', 'irritable', 'anxious', 'tired']))
      .max(6)
      .optional(),
    garden: z
      .array(z.enum(['adhkar', 'dhikr', 'salawat', 'istighfar', 'listen', 'learn', 'kindness']))
      .max(7)
      .optional(),
  }),
});
