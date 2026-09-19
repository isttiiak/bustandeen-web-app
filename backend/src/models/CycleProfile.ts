import mongoose, { Schema, Document } from 'mongoose';

/**
 * Per-user Rayhanah Cycle settings. The madhab choice only affects the
 * maximum-hayd threshold used for the istihada guidance (Hanafi: 10 days;
 * majority/Shafi'i: 15 days). Nifas guidance uses 40 days for both
 * (Umm Salamah's report, Abu Dawud 311) with the difference noted in the UI.
 */
export interface ICycleProfile extends Document {
  userId: string;
  madhab: 'hanafi' | 'majority';
  /** Opt-in, revocable partner status-sharing (see cycle.service.ts). Off by
   * default; sharing anything requires BOTH partnerSyncEnabled=true AND a
   * partnerUid set — a partnerUid alone (e.g. left over after disabling)
   * shares nothing. */
  partnerSyncEnabled: boolean;
  partnerUid?: string;
  /** Pregnancy status — distinct from hayd/nifas: it does NOT excuse salat or
   * fasting on its own (that stays a per-day decision handled elsewhere), it
   * only suspends hayd cycle PREDICTIONS (periods stop during pregnancy, so
   * forecasting a "next period" would be actively wrong) and swaps the
   * Rayhanah page into a pregnancy-specific view. */
  pregnancy?: {
    active: boolean;
    /** Expected due date (YYYY-MM-DD), used only to show a week count. */
    dueDate?: string;
  };
  /** AES-256-GCM encrypted JSON: {heightCm?: number, weightKg?: number} */
  bodyStatsEncrypted?: string;
}

const CycleProfileSchema = new Schema<ICycleProfile>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    madhab: { type: String, enum: ['hanafi', 'majority'], default: 'majority' },
    partnerSyncEnabled: { type: Boolean, default: false },
    partnerUid: { type: String },
    pregnancy: {
      type: new Schema(
        {
          active: { type: Boolean, default: false },
          dueDate: { type: String },
        },
        { _id: false }
      ),
      required: false,
      default: undefined,
    },
    bodyStatsEncrypted: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<ICycleProfile>('CycleProfile', CycleProfileSchema);
