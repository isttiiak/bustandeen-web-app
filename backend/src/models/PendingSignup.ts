import mongoose, { Document, Schema } from 'mongoose';

/**
 * An email sign-up waiting for its confirmation link (email-first sign-up,
 * v5.156.0). No Firebase account and no User document exist until the link
 * is opened and a password chosen (services/signup.service.ts). Only a hash
 * of the link's token is stored; the row expires with the link (TTL), and a
 * new request for the same email replaces it, so older links stop working.
 */
export interface IPendingSignup extends Document {
  email: string;
  tokenHash: string;
  firstName: string;
  lastName: string;
  gender: 'male' | 'female';
  lang: 'en' | 'bn';
  expiresAt: Date;
  createdAt: Date;
}

const pendingSignupSchema = new Schema<IPendingSignup>({
  email: { type: String, required: true },
  tokenHash: { type: String, required: true },
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  gender: { type: String, enum: ['male', 'female'], required: true },
  lang: { type: String, enum: ['en', 'bn'], default: 'en' },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Built by sync-indexes (autoIndex is off in production). Lookups still work
// before they exist, the collection is tiny; the TTL index does the clean-up.
pendingSignupSchema.index({ email: 1 }, { unique: true });
pendingSignupSchema.index({ tokenHash: 1 });
pendingSignupSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IPendingSignup>('PendingSignup', pendingSignupSchema);
