import mongoose, { Schema } from 'mongoose';

/**
 * One nudge: a friend's gentle "come back to the journey" to someone who has
 * been quiet. Every nudge is its own record so the recipient can keep a history
 * and delete entries from it.
 *
 * - The recipient deleting an entry only HIDES it (`hiddenAt`): the sender's
 *   one-a-day limit still counts it, so deleting history cannot be used to be
 *   nudged again at once.
 * - Unfriend, block and account deletion remove the records for real, and so
 *   does the 90-day expiry.
 */
export const NUDGE_MESSAGE_MAX = 140;

interface INudge {
  fromUid: string;
  toUid: string;
  /** The optional short message ('' when none was added) */
  message: string;
  createdAt: Date;
  /** Which cooldown window it was sent in: the unique index makes two quick taps land once */
  slot: number;
  /** When the recipient dismissed the pop-up; null while it is still unseen */
  seenAt: Date | null;
  /** When the recipient deleted it from their history */
  hiddenAt: Date | null;
}

const nudgeSchema = new Schema<INudge>({
  fromUid: { type: String, required: true },
  toUid: { type: String, required: true },
  message: { type: String, default: '', maxlength: NUDGE_MESSAGE_MAX },
  createdAt: { type: Date, required: true, default: () => new Date() },
  slot: { type: Number, required: true },
  seenAt: { type: Date, default: null },
  hiddenAt: { type: Date, default: null },
});

nudgeSchema.index({ fromUid: 1, toUid: 1, slot: 1 }, { unique: true });
nudgeSchema.index({ toUid: 1, hiddenAt: 1, createdAt: -1 });
nudgeSchema.index({ fromUid: 1, createdAt: -1 });
nudgeSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export default mongoose.model<INudge>('Nudge', nudgeSchema);
