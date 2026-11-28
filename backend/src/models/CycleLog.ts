import mongoose, { Schema, Document } from 'mongoose';

/**
 * One menstrual (hayd) or post-natal (nifas) bleeding episode.
 * Dates are client-authoritative local civil strings (YYYY-MM-DD) like salat
 * and fasting. endDate is null while the episode is ongoing.
 *
 * PRIVACY: this collection must NEVER be exposed through any social endpoint.
 * The leaderboard only consumes it indirectly (excused-day Noor substitution)
 * and no "excused" flag ever leaves the server.
 */
export interface ICycleLog extends Document {
  userId: string;
  type: 'hayd' | 'nifas';
  startDate: string;
  endDate: string | null;
  /** The moment the user marked the episode finished. On the end day, prayers whose
   * time had already run out by then were not owed (the app shows them as excused).
   * Absent on episodes ended before this field, or entered or edited by date only. */
  endedAt?: Date | null;
  note?: string;
}

const CycleLogSchema = new Schema<ICycleLog>(
  {
    userId: { type: String, required: true, index: true },
    type: { type: String, enum: ['hayd', 'nifas'], default: 'hayd' },
    startDate: { type: String, required: true },
    endDate: { type: String, default: null },
    endedAt: { type: Date, default: null },
    note: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

CycleLogSchema.index({ userId: 1, startDate: 1 }, { unique: true });

// One OPEN cycle per person (audit 2026-11-16 P1-8). "Is one open?" then "create
// one" cannot stop two requests at once from both passing the check; this can.
// Partial: ended cycles are not limited. The key is (userId, endDate) rather
// than userId alone so that it is a distinct index from the plain userId one and
// `npm run sync-indexes` sees it. Building it on a collection that already has
// two open cycles for one person fails: count them first (npm run audit:open-cycles).
CycleLogSchema.index(
  { userId: 1, endDate: 1 },
  {
    unique: true,
    partialFilterExpression: { endDate: { $type: 'null' } },
    name: 'one_open_cycle_per_user',
  }
);

export default mongoose.model<ICycleLog>('CycleLog', CycleLogSchema);
