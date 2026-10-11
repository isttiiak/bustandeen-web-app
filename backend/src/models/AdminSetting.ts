import mongoose, { Schema } from 'mongoose';

/**
 * Admin-panel switches the Servant controls. A single document with
 * `_id: 'global'` (so no extra index to sync); absent = every default.
 */
export interface IAdminSetting {
  _id: string;
  /** T1.4: admins need the authenticator code at sign-in. Off by default
   *  (Istiak, 2026-10-11): the Servant turns it on when ready, and may turn
   *  it off during busy development. Enrolments are kept either way. */
  mfaRequired: boolean;
  updatedBy?: string | null;
  updatedAt?: Date | null;
}

const AdminSettingSchema = new Schema<IAdminSetting>(
  {
    _id: { type: String, required: true },
    mfaRequired: { type: Boolean, default: false },
    updatedBy: { type: String, default: null },
    updatedAt: { type: Date, default: null },
  },
  { versionKey: false }
);

export default mongoose.model<IAdminSetting>('AdminSetting', AdminSettingSchema);
