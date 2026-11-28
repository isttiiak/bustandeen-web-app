import mongoose, { Document, Schema } from 'mongoose';

/**
 * A friend's nudge to someone who has been quiet: "come back to the journey".
 * One document per (sender, recipient) pair, updated in place, so the
 * recipient sees how many times this friend has nudged them, a predefined
 * motivating text and the latest short message the sender chose to add.
 *
 * Kept only while the friendship stands (unfriend, block and account deletion
 * remove it) and for 90 days after the last nudge.
 */
export const NUDGE_MESSAGE_MAX = 140;

interface INudge extends Document {
  fromUid: string;
  toUid: string;
  /** Times fromUid has nudged toUid (all time, while the document lives) */
  count: number;
  /** The latest optional short message ('' when none was added) */
  message: string;
  /** When the latest nudge was sent */
  lastNudgedAt: Date;
  /** When toUid dismissed the latest nudge; null while it is still unseen */
  seenAt: Date | null;
}

const nudgeSchema = new Schema<INudge>({
  fromUid: { type: String, required: true },
  toUid: { type: String, required: true },
  count: { type: Number, required: true, default: 0, min: 0 },
  message: { type: String, default: '', maxlength: NUDGE_MESSAGE_MAX },
  lastNudgedAt: { type: Date, required: true },
  seenAt: { type: Date, default: null },
});

nudgeSchema.index({ fromUid: 1, toUid: 1 }, { unique: true });
nudgeSchema.index({ toUid: 1, seenAt: 1 });
nudgeSchema.index({ fromUid: 1, lastNudgedAt: 1 });
nudgeSchema.index({ lastNudgedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export default mongoose.model<INudge>('Nudge', nudgeSchema);
