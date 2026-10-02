// Preset profile avatars (audit T2.8 follow-up). Firebase Storage is not
// enabled (it needs the Blaze plan), so photos are never uploaded: a user has
// either their Google photo (an https URL in `photoUrl`) or one of these
// preset ids in `avatarId`. The frontend draws each id as an SVG
// (frontend/src/components/icons/AvatarGlyphs.tsx); keep both lists in sync.
export const AVATAR_IDS = [
  'leaf',
  'palm',
  'crescent',
  'star',
  'lantern',
  'arch',
  'dome',
  'olive',
  'rose',
  'mountain',
  'wave',
  'book',
] as const;

export type AvatarId = (typeof AVATAR_IDS)[number];

export function isAvatarId(v: unknown): v is AvatarId {
  return typeof v === 'string' && (AVATAR_IDS as readonly string[]).includes(v);
}
