import mongoose, { Document, Schema } from 'mongoose';

/**
 * A national moon-sighting decision (T4.1, FIQH-02). Umm al-Qura follows the
 * Saudi calendar; a country's committee often starts a month a day earlier or
 * later. From `effectiveFrom` (a Gregorian date) until the next active record
 * for the same country, that country's devices shift the Umm al-Qura date by
 * `offset` days, unless the user has set their own offset.
 *
 * Records are never hard-deleted: a mistaken one is deactivated (audit-logged)
 * so the history of what the app showed stays reviewable.
 */
export interface IMoonSighting extends Document {
  /** ISO 3166-1 alpha-2, upper case (e.g. "BD") */
  country: string;
  /** YYYY-MM-DD, the first Gregorian day the offset applies */
  effectiveFrom: string;
  /** Days relative to Umm al-Qura: -1, 0 or +1 */
  offset: number;
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
    effectiveFrom: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    offset: { type: Number, required: true, min: -1, max: 1 },
    note: { type: String, required: true, maxlength: 200 },
    sourceUrl: { type: String, maxlength: 300 },
    active: { type: Boolean, default: true },
    createdBy: { type: String, required: true },
    deactivatedBy: { type: String },
    deactivatedAt: { type: Date },
  },
  { timestamps: true }
);

moonSightingSchema.index({ active: 1, country: 1, effectiveFrom: 1 });

export default mongoose.model<IMoonSighting>('MoonSighting', moonSightingSchema);
