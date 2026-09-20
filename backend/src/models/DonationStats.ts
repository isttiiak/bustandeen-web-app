import mongoose, { Document, Schema } from 'mongoose';

export interface IQuarterlyEntry {
  quarter: string; // 'YYYY-Qn', e.g. '2026-Q3' — sortable as a plain string
  received: number;
  spent: number;
  notes: string;
  /** Gates public visibility — the public /api/sadaqah/stats endpoint only
   * ever excludes an entry when this is explicitly `false` (see
   * sadaqah.service.ts getPublicStats, checked as `!== false`, not a truthy
   * check). A pre-existing entry saved before this field existed has no
   * `published` key in the raw stored document at all — Mongoose's schema
   * `default` below does NOT reliably backfill that on every read path for
   * array subdocuments, so code must never assume a missing key reads back
   * as `true`. Only `unpublishQuarterly` ever explicitly sets `false`. */
  published: boolean;
}

export interface IDonationStats extends Document<string> {
  totalVerifiedAmount: number;
  totalVerifiedCount: number;
  lastUpdated: Date;
  quarterlyBreakdown: IQuarterlyEntry[];
}

// Single cached-aggregate document (_id: 'current') — the public /stats
// endpoint reads only this, so it structurally can never leak donor PII
// regardless of what's added to the `donations` collection later.
const donationStatsSchema = new Schema<IDonationStats>({
  _id: { type: String, required: true },
  totalVerifiedAmount: { type: Number, default: 0 },
  totalVerifiedCount: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
  quarterlyBreakdown: {
    type: [
      {
        quarter: { type: String, required: true },
        received: { type: Number, default: 0 },
        spent: { type: Number, default: 0 },
        notes: { type: String, default: '' },
        published: { type: Boolean, default: true },
      },
    ],
    default: [],
  },
});

export default mongoose.model<IDonationStats>('DonationStats', donationStatsSchema);
