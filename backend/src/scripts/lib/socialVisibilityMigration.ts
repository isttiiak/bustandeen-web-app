import type mongoose from 'mongoose';

type Collection<T extends object> = mongoose.mongo.Collection<T>;

/**
 * T3.6 (FIQH-03): gives every pre-T3.6 SocialProfile an explicit `visibility`
 * that keeps what its friends already saw: invisible → 'hidden', else 'detail'.
 * Only profiles created from T3.6 on start at 'streaks' (getOrCreateProfile).
 *
 * - Idempotent: only profiles WITHOUT a visibility are touched.
 * - Reversible: migrated values carry visibilitySource 'migrated'; revert
 *   removes exactly those, so a choice a user made since is never undone.
 * - The app reads an unmigrated profile the same way (effectiveVisibility),
 *   so running this changes no one's visibility; it only makes it explicit.
 */

export interface ProfileDoc {
  userId: string;
  invisible?: boolean;
  visibility?: string;
  visibilitySource?: string;
}

export interface MigrationReport {
  toHidden: number;
  toDetail: number;
  reverted: number;
}

export async function migrateSocialVisibility(
  col: Collection<ProfileDoc>,
  opts: { apply: boolean }
): Promise<MigrationReport> {
  const missing = { visibility: { $exists: false } };
  const toHidden = await col.countDocuments({ ...missing, invisible: true });
  const toDetail = await col.countDocuments({ ...missing, invisible: { $ne: true } });
  if (opts.apply) {
    await col.updateMany(
      { ...missing, invisible: true },
      { $set: { visibility: 'hidden', visibilitySource: 'migrated' } }
    );
    await col.updateMany(
      { ...missing, invisible: { $ne: true } },
      { $set: { visibility: 'detail', visibilitySource: 'migrated' } }
    );
  }
  return { toHidden, toDetail, reverted: 0 };
}

export async function revertSocialVisibility(
  col: Collection<ProfileDoc>,
  opts: { apply: boolean }
): Promise<MigrationReport> {
  const filter = { visibilitySource: 'migrated' };
  const reverted = await col.countDocuments(filter);
  if (opts.apply) {
    await col.updateMany(filter, { $unset: { visibility: '', visibilitySource: '' } });
  }
  return { toHidden: 0, toDetail: 0, reverted };
}
