import mongoose, { Document, Schema } from 'mongoose';

/**
 * Replaces the old Web3Forms-only path (frontend POSTed straight to a
 * third-party form API — nothing was ever stored or manageable). Both
 * /feedback and /contact submit here now; `kind` distinguishes them for
 * filtering only, the review flow is identical.
 */
export type FeedbackKind = 'feedback' | 'contact';
export type FeedbackStatus = 'open' | 'replied' | 'archived';

export interface IFeedbackMessage extends Document {
  name: string;
  email: string;
  message: string;
  category: string[];
  kind: FeedbackKind;
  userId: string | null;
  status: FeedbackStatus;
  adminNote?: string | null;
  emailMessageId: string | null;
  repliedAt?: Date | null;
  repliedBy?: string | null;
  ipAddress?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const feedbackMessageSchema = new Schema<IFeedbackMessage>(
  {
    name: { type: String, required: true, maxlength: 200 },
    email: { type: String, required: true, maxlength: 200 },
    message: { type: String, required: true, maxlength: 4000 },
    category: { type: [String], default: [] },
    kind: { type: String, enum: ['feedback', 'contact'], required: true },
    userId: { type: String, default: null },
    status: { type: String, enum: ['open', 'replied', 'archived'], default: 'open', index: true },
    adminNote: { type: String, default: null, maxlength: 2000 },
    emailMessageId: { type: String, default: null },
    repliedAt: { type: Date, default: null },
    repliedBy: { type: String, default: null },
    // Abuse-investigation only, never returned by any API response, mirrors
    // Donation.ipAddress's select:false convention.
    ipAddress: { type: String, default: null, select: false },
  },
  { timestamps: true }
);

feedbackMessageSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<IFeedbackMessage>('FeedbackMessage', feedbackMessageSchema);
