import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

export const MAX_FRIENDS = 50;

/** What friends see of me (T3.6, FIQH-03):
 *  - hidden:  nothing, not even existing friends (the old `invisible: true`)
 *  - streaks: consistency only (streaks + active days this week), no daily numbers
 *  - detail:  today's prayers, dhikr, fasting, Quran and Noor
 * New profiles start at 'streaks'. Profiles created before T3.6 have no value
 * until scripts/migrateSocialVisibility.ts runs; effectiveVisibility() reads them
 * as they were (invisible → hidden, else detail). */
export const VISIBILITIES = ['hidden', 'streaks', 'detail'] as const;
export type Visibility = (typeof VISIBILITIES)[number];

/** Secret deeds: areas friends never see and that never count toward the Noor
 * friends see. They still count in the user's own analytics and own Noor. */
export const SECRET_AREAS = ['salat', 'zikr', 'quran', 'fasting'] as const;
export type SecretArea = (typeof SECRET_AREAS)[number];
export type SecretAreas = Record<SecretArea, boolean>;

export interface ISocialProfile extends Document {
  userId: string;
  /** Stable, url-safe code embedded in the user's invite link */
  inviteCode: string;
  /** Firebase uids of connected friends (mutual — both docs list each other) */
  friends: string[];
  /** friend uid → date the connection was made (missing for pre-migration friendships) */
  friendSince: Map<string, Date>;
  /** Uids who opened MY invite link and are awaiting my accept/reject */
  pendingIncoming: string[];
  /** Uids whose invite link I opened, awaiting their accept/reject */
  pendingOutgoing: string[];
  /** Uids I've blocked — they can no longer reach me via invite code, and any
   * existing friendship/pending request between us is torn down immediately */
  blocked: string[];
  /** Legacy mirror of `visibility === 'hidden'`, kept in sync for one release
   * so a revert (or an old cached client) still behaves. Read via
   * effectiveVisibility(), never directly. */
  invisible: boolean;
  /** Absent on pre-T3.6 profiles that the migration has not reached yet */
  visibility?: Visibility;
  /** 'migrated' marks values written by the migration, so --revert only
   * touches those (a choice the user made later is never reverted) */
  visibilitySource?: 'migrated';
  secret: SecretAreas;
  createdAt: Date;
  updatedAt: Date;
}

const socialProfileSchema = new Schema<ISocialProfile>(
  {
    userId: { type: String, required: true, unique: true },
    inviteCode: { type: String, required: true, unique: true },
    friends: { type: [String], default: [] },
    friendSince: { type: Map, of: Date, default: {} },
    pendingIncoming: { type: [String], default: [] },
    pendingOutgoing: { type: [String], default: [] },
    blocked: { type: [String], default: [] },
    invisible: { type: Boolean, default: false },
    // No default: a missing value is how a pre-T3.6 profile is recognised
    visibility: { type: String, enum: VISIBILITIES },
    visibilitySource: { type: String, enum: ['migrated'] },
    secret: {
      salat: { type: Boolean, default: false },
      zikr: { type: Boolean, default: false },
      quran: { type: Boolean, default: false },
      fasting: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

/** The visibility in force, for migrated and not-yet-migrated profiles alike. */
export function effectiveVisibility(p: {
  visibility?: Visibility | null;
  invisible?: boolean;
}): Visibility {
  if (p.visibility) return p.visibility;
  return p.invisible ? 'hidden' : 'detail';
}

export function generateInviteCode(): string {
  return crypto.randomBytes(6).toString('base64url'); // 8 url-safe chars
}

export default mongoose.model<ISocialProfile>('SocialProfile', socialProfileSchema);
