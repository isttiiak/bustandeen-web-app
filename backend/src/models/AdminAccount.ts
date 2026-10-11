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
  /** Admin tokens from a sign-in before this moment are refused
   *  (requireAdminAuth). Set when the row is created or linked to a Firebase
   *  account, so a session that existed before the account became an admin
   *  never carries over. */
  sessionsValidAfter?: Date | null;
  /** Second factor (T1.4): the authenticator secret, encrypted with
   *  fieldCrypto. Null until enrolment is confirmed with a first code. */
  totpSecretEnc?: string | null;
  /** A secret shown during enrolment but not yet confirmed (10 minutes). */
  totpPendingSecretEnc?: string | null;
  totpPendingAt?: Date | null;
  totpEnabledAt?: Date | null;
  /** Last accepted 30-second step: a code is never accepted twice. */
  totpLastStep?: number | null;
  /** SHA-256 of each unused backup code; one is removed when used. */
  backupCodeHashes?: string[];
  /** Bumped on every enrolment and reset, voiding older MFA proofs. */
  mfaVersion: number;
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
  sessionsValidAfter: { type: Date, default: null },
  totpSecretEnc: { type: String, default: null },
  totpPendingSecretEnc: { type: String, default: null },
  totpPendingAt: { type: Date, default: null },
  totpEnabledAt: { type: Date, default: null },
  totpLastStep: { type: Number, default: null },
  backupCodeHashes: { type: [String], default: [] },
  mfaVersion: { type: Number, default: 0 },
});

export default mongoose.model<IAdminAccount>('AdminAccount', AdminAccountSchema);
