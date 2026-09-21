import mongoose, { Document, Schema } from 'mongoose';
import { PRAYER_IDS, type PrayerId } from './SalatLog.js';

/**
 * The plan a user accepted for one week (Monday-Sunday) of Naseeh's "weekly
 * plan" card. A plan that has not been accepted is never stored: it is worked
 * out fresh from the last four weeks each time it is shown.
 *
 * Nothing in here is cycle data. Rest days only ever shorten how many days a
 * target can be met on (worked out on the server when the plan is read), and
 * no plan text is ever sent to an AI.
 */
export type PlanKind = 'zikr' | 'quran' | 'salat';

export interface IPlanTarget {
  kind: PlanKind;
  /** zikr: dhikr per day; quran: ayat per day. Not used for salat. */
  dailyAmount?: number;
  /** salat only: the prayer to focus on. */
  prayer?: PrayerId;
  /** On how many days this week the daily bar should be met. */
  daysTarget: number;
}

export interface INaseehPlan extends Document {
  userId: string;
  /** Monday of the week, YYYY-MM-DD. */
  weekStart: string;
  accepted: boolean;
  acceptedAt?: Date;
  targets: IPlanTarget[];
  createdAt: Date;
  updatedAt: Date;
}

const targetSchema = new Schema<IPlanTarget>(
  {
    kind: { type: String, enum: ['zikr', 'quran', 'salat'], required: true },
    dailyAmount: { type: Number, min: 1, max: 100000 },
    prayer: { type: String, enum: PRAYER_IDS },
    daysTarget: { type: Number, required: true, min: 1, max: 7 },
  },
  { _id: false }
);

const naseehPlanSchema = new Schema<INaseehPlan>(
  {
    userId: { type: String, required: true },
    weekStart: { type: String, required: true },
    accepted: { type: Boolean, default: false },
    acceptedAt: { type: Date },
    targets: { type: [targetSchema], default: [] },
  },
  { timestamps: true }
);

naseehPlanSchema.index({ userId: 1, weekStart: 1 }, { unique: true });

export default mongoose.model<INaseehPlan>('NaseehPlan', naseehPlanSchema);
