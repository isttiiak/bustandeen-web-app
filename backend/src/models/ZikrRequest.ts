import mongoose, { Document, Schema } from 'mongoose';

export type ZikrRequestStatus = 'pending' | 'approved' | 'rejected';
export type PossibleDuplicateModel = 'GlobalZikrLibraryItem' | 'ZikrRequest';

export interface IZikrRequest extends Document {
  userId: string;
  userEmail?: string;
  name: string;
  arabic?: string;
  meaning?: string;
  source?: string;
  sourceUrl?: string;
  /** Simple yes/no signal of intent, not a file or upload — "does this user
   * want an audio recitation for this zikr, if/when it's added." */
  wantsAudio: boolean;
  status: ZikrRequestStatus;
  adminNote?: string;
  reviewedAt?: Date;
  reviewedBy?: string;
  /** Message-ID of the submission-confirmation email sent to the requester
   * (see zikrRequest.service.ts submitRequest) — later approve/reject emails
   * thread against this so the whole conversation groups in the requester's
   * inbox, mirroring Donation.emailMessageId. Null when no confirmation email
   * could be sent (no userEmail, or mail send failed). */
  emailMessageId?: string | null;
  /** Non-blocking hint set at submission time when this request's name looks
   * like it might already exist — never used to refuse a submission (names
   * can legitimately vary in spelling/transliteration), only surfaced to the
   * admin reviewing it. */
  possibleDuplicateOf?: mongoose.Types.ObjectId | null;
  possibleDuplicateOfModel?: PossibleDuplicateModel | null;
  /** Set once the requester has dismissed the in-app "we added it" notice —
   * lets the frontend show that one-time card without a separate generic
   * notifications system. */
  userAcknowledged: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const zikrRequestSchema = new Schema<IZikrRequest>(
  {
    userId: { type: String, required: true, index: true },
    userEmail: { type: String },
    name: { type: String, required: true, maxlength: 100 },
    arabic: { type: String, maxlength: 2000 },
    // Only the name/title is mandatory to submit a request — the admin fills
    // in/verifies the rest (meaning, source, etc.) during review.
    meaning: { type: String, maxlength: 2000 },
    source: { type: String, maxlength: 200 },
    sourceUrl: { type: String, maxlength: 500 },
    wantsAudio: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    adminNote: { type: String, maxlength: 2000 },
    reviewedAt: { type: Date },
    reviewedBy: { type: String },
    emailMessageId: { type: String, default: null },
    possibleDuplicateOf: {
      type: Schema.Types.ObjectId,
      refPath: 'possibleDuplicateOfModel',
      default: null,
    },
    possibleDuplicateOfModel: {
      type: String,
      enum: ['GlobalZikrLibraryItem', 'ZikrRequest'],
      default: null,
    },
    userAcknowledged: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<IZikrRequest>('ZikrRequest', zikrRequestSchema);
