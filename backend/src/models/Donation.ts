import mongoose, { Document, Schema } from 'mongoose';

export interface IDonation extends Document {
  donorName: string | null;
  onBehalfOf: string | null;
  email: string;
  phone: string;
  paymentMethod: 'bkash' | 'nagad';
  transactionId: string;
  amount: number;
  transactionDate: Date;
  message: string | null;
  showNamePublicly: boolean;
  isAnonymous: boolean;
  userId: string | null;
  status: 'pending' | 'verified' | 'rejected';
  verifiedAt: Date | null;
  verifiedBy: string | null;
  rejectionReason: string | null;
  ipAddress: string | null;
  /** Message-ID of the first (received) email, so verify/reject replies can
   *  thread against it — otherwise a donor sees 3 separate email threads for
   *  one donation instead of one conversation. */
  emailMessageId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const donationSchema = new Schema<IDonation>(
  {
    donorName: { type: String, default: null },
    onBehalfOf: { type: String, default: null },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    paymentMethod: { type: String, enum: ['bkash', 'nagad'], required: true },
    // Normalized uppercase+trimmed so case/whitespace variants of the same
    // bKash TrxID can't slip past the uniqueness index below.
    transactionId: { type: String, required: true, uppercase: true, trim: true },
    amount: { type: Number, required: true, min: 10, max: 25000 },
    transactionDate: { type: Date, required: true },
    message: { type: String, default: null, maxlength: 500 },
    showNamePublicly: { type: Boolean, default: false },
    isAnonymous: { type: Boolean, default: false },
    userId: { type: String, default: null },
    status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
    verifiedAt: { type: Date, default: null },
    verifiedBy: { type: String, default: null },
    rejectionReason: { type: String, default: null },
    // select:false — abuse-investigation only, never returned by any API
    // response (public or admin) unless a future query explicitly opts in
    // with .select('+ipAddress').
    ipAddress: { type: String, default: null, select: false },
    emailMessageId: { type: String, default: null },
  },
  { timestamps: true }
);

// A transactionId may only be "in flight" once (pending or verified) at a
// time. Scoping the uniqueness to those two statuses — rather than globally
// unique — keeps a REJECTED submission's TrxID resubmittable: a donor
// correcting a typo'd amount reuses the same real bKash transaction, and a
// hard global-unique index would permanently lock that TrxID out after a
// single rejected attempt.
donationSchema.index(
  { transactionId: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['pending', 'verified'] } } }
);

// Admin pending-queue / all-submissions list: filter by status, newest first.
donationSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<IDonation>('Donation', donationSchema);
