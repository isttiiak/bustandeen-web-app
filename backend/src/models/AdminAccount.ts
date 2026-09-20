import mongoose, { Document, Schema } from 'mongoose';

export type AdminRole = 'servant' | 'ansar';
export type AnsarDomain = 'sadaqah' | 'general';

/**
 * A real Firebase account (its own email/password, verified via Firebase
 * Admin SDK on every request) that is additionally registered here as an
 * admin. This collection is the single source of truth for WHO is an admin
 * and WHICH role they hold — Firebase only proves identity, never authority.
 * Deactivating a row here revokes admin access immediately, even though the
 * person's Firebase ID token stays valid until it expires.
 *
 * 'servant' (istiak@bustandeen.com) is the owner tier — every operation,
 * including managing this collection itself (adding/deactivating an 'ansar'),
 * and bypasses `ansarDomain` scoping entirely.
 * 'ansar' is the day-to-day reviewer tier — no access to critical/destructive
 * operations or this account-management surface, and additionally scoped by
 * `ansarDomain` to exactly one operational area: 'sadaqah' (donation review —
 * sadaqah@bustandeen.com) or 'general' (everything else, e.g. zikr-request
 * review — ansar@bustandeen.com). See `requireDomain` in middleware/auth.ts.
 */
export interface IAdminAccount extends Document {
  firebaseUid: string;
  email: string;
  displayName?: string;
  role: AdminRole;
  ansarDomain: AnsarDomain | null;
  active: boolean;
  createdBy: string; // email of the servant who created this row, or 'bootstrap'
  createdAt: Date;
  lastLoginAt?: Date | null;
}

const AdminAccountSchema = new Schema<IAdminAccount>({
  firebaseUid: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  displayName: { type: String },
  role: { type: String, enum: ['servant', 'ansar'], required: true },
  ansarDomain: { type: String, enum: ['sadaqah', 'general'], default: null },
  active: { type: Boolean, default: true },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date, default: null },
});

export default mongoose.model<IAdminAccount>('AdminAccount', AdminAccountSchema);
