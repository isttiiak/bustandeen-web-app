import { z } from 'zod';

export const linkGoogleSchema = z.object({
  body: z.object({
    googleEmail: z.string().email(),
    googleUid: z.string().min(1),
  }),
});

export const unlinkGoogleSchema = z.object({
  body: z.object({
    providerUid: z.string().min(1),
  }),
});

export const setPrimaryEmailSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

// photoUrl must be either:
//   (a) an https URL (≤ 2 KB) — the normal path after the Firebase Storage migration, or
//   (b) a base64 data URL with MIME image/jpeg|png|webp only, total ≤ 2 KB — tiny
//       legacy avatars; reject data:text/* and any non-image MIME outright (XSS risk).
//       New uploads must go through Firebase Storage; only the https URL comes here.
const PHOTO_SAFE_DATA_RE = /^data:image\/(jpeg|png|webp);base64,/;
const photoUrlSchema = z
  .string()
  .min(1)
  .refine(
    (val) => {
      if (val.startsWith('https://')) return val.length <= 2048;
      // Reject data:text/* and any non-image MIME (SVG, HTML, etc.) — they can
      // carry executable content and must never land in the User document.
      if (!PHOTO_SAFE_DATA_RE.test(val)) return false;
      return val.length <= 2048;
    },
    {
      message:
        'photoUrl must be an https URL (≤2 KB) or a base64 image/jpeg|png|webp (≤2 KB). Upload photos to Firebase Storage.',
    }
  );

export const updateUserSchema = z.object({
  body: z.object({
    displayName: z.string().min(1).max(100).optional(),
    photoUrl: photoUrlSchema.optional(),
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    gender: z.enum(['male', 'female', 'other', 'prefer_not_say']).optional(),
    birthDate: z.string().date().optional(),
    occupation: z.string().max(100).optional(),
    bio: z.string().max(250).optional(),
    city: z.string().max(100).optional(),
    country: z.string().max(100).optional(),
    hijriOffset: z.number().int().min(-1).max(1).optional(),
    dayStartMode: z.enum(['fajr', 'midnight', 'maghrib']).optional(),
    aiEnabled: z.boolean().optional(),
  }),
});

// Cross-device preferences. Keys are checked against the whitelist in the
// service (unknown keys are dropped, not rejected, so an older server never
// breaks a newer client); this only bounds the shape and size.
export const putPrefsSchema = z.object({
  body: z.object({
    prefs: z
      .record(
        z.string().max(64),
        z.object({
          v: z.string().max(4000),
          t: z.number().int().nonnegative(),
        })
      )
      .refine((r) => Object.keys(r).length <= 64, 'Too many keys'),
  }),
});
