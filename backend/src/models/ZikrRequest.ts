import mongoose, { Document, Schema } from 'mongoose';

export type ZikrRequestStatus = 'pending' | 'approved' | 'rejected';

export interface IZikrRequest extends Document {
  userId: string;
  userEmail?: string;
  name: string;
  arabic?: string;
  meaning: string;
  source?: string;
  sourceUrl?: string;
  status: ZikrRequestStatus;
  adminNote?: string;
  reviewedAt?: Date;
  reviewedBy?: string;
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
    meaning: { type: String, required: true, maxlength: 2000 },
    source: { type: String, maxlength: 200 },
    sourceUrl: { type: String, maxlength: 500 },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    adminNote: { type: String, maxlength: 2000 },
    reviewedAt: { type: Date },
    reviewedBy: { type: String },
    userAcknowledged: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<IZikrRequest>('ZikrRequest', zikrRequestSchema);
