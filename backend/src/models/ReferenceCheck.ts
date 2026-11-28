import mongoose, { Document, Schema } from 'mongoose';

/**
 * A manual check of one reference on the public reference map (/references):
 * a person opened the source, or a scholar confirmed it. The reference list
 * itself ships with the app (frontend/src/data/references/registry.ts); only
 * these marks live here, so the Servant can add them from the admin panel and
 * they show on the public page at once.
 *
 * One document per reference (`refId` is the registry id, such as
 * "bukhari:1166"). Every save and every clear is in the admin audit log with
 * the values before and after, so the history stays reviewable.
 */
export type ReferenceCheckStatus = 'source-verified' | 'scholar-confirmed' | 'needs-correction';

export const REFERENCE_CHECK_STATUSES: readonly ReferenceCheckStatus[] = [
  'source-verified',
  'scholar-confirmed',
  'needs-correction',
];

export interface IReferenceCheck extends Document {
  refId: string;
  status: ReferenceCheckStatus;
  /** Who checked: the Servant's own name, or the scholar's. */
  by: string;
  /** YYYY-MM-DD, the day of the check */
  date: string;
  note?: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const referenceCheckSchema = new Schema<IReferenceCheck>(
  {
    refId: { type: String, required: true, maxlength: 80 },
    status: { type: String, required: true, enum: REFERENCE_CHECK_STATUSES },
    by: { type: String, required: true, maxlength: 80 },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    note: { type: String, maxlength: 1000 },
    updatedBy: { type: String, required: true },
  },
  { timestamps: true }
);

referenceCheckSchema.index({ refId: 1 }, { unique: true });

export default mongoose.model<IReferenceCheck>('ReferenceCheck', referenceCheckSchema);
