import mongoose, { Document, Schema } from 'mongoose';

/**
 * A national moon-sighting decision (T4.1, FIQH-02; month-start records
 * since v5.157.0): "{hijriMonth} {hijriYear} began on {startDate} in
 * {country}", as the country's committee announced it. Devices on Automatic
 * count that month from its start (29 or 30 days) and fall back to Umm
 * al-Qura, shifted like the latest record, until the next announcement
 * (rule: frontend/src/utils/hijriOffset.ts resolveHijriDay).
 *
 * Records are never hard-deleted: a mistaken one is deactivated (audit-logged)
 * so the history of what the app showed stays reviewable.
 */
export interface IMoonSighting extends Document {
  /** ISO 3166-1 alpha-2, upper case (e.g. "BD") */
  country: string;
  hijriYear: number;
  /** 1-12 */
  hijriMonth: number;
  /** YYYY-MM-DD, the 1st of that month in the country */
  startDate: string;
  /** Shown to users, e.g. the committee's announcement in one line */
  note: string;
  /** Link to the announcement, if public */
  sourceUrl?: string;
  active: boolean;
  createdBy: string;
  deactivatedBy?: string;
  deactivatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const moonSightingSchema = new Schema<IMoonSighting>(
  {
    country: { type: String, required: true, match: /^[A-Z]{2}$/ },
    hijriYear: { type: Number, required: true, min: 1400, max: 1600 },
    hijriMonth: { type: Number, required: true, min: 1, max: 12 },
    startDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    note: { type: String, required: true, maxlength: 200 },
    sourceUrl: { type: String, maxlength: 300 },
    active: { type: Boolean, default: true },
    createdBy: { type: String, required: true },
    deactivatedBy: { type: String },
    deactivatedAt: { type: Date },
  },
  { timestamps: true }
);

moonSightingSchema.index({ active: 1, country: 1, startDate: 1 });
// One active announcement per country and month (deactivate to replace one)
moonSightingSchema.index(
  { country: 1, hijriYear: 1, hijriMonth: 1 },
  { unique: true, partialFilterExpression: { active: true } }
);

export default mongoose.model<IMoonSighting>('MoonSighting', moonSightingSchema);
