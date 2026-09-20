import mongoose, { Document, Schema } from 'mongoose';

/**
 * A running internal cost log for the sadaqah project — separate from
 * `DonationStats.quarterlyBreakdown`, which is one manually-entered aggregate
 * "spent" figure per quarter for the public transparency page. This is the
 * itemized ledger behind that figure (what was actually paid for, and when),
 * admin-only, not shown publicly.
 */
export interface ISadaqahExpense extends Document {
  date: Date;
  amount: number;
  description: string;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const sadaqahExpenseSchema = new Schema<ISadaqahExpense>(
  {
    date: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, required: true, maxlength: 300 },
    createdBy: { type: String, default: null },
  },
  { timestamps: true }
);

sadaqahExpenseSchema.index({ date: -1 });

export default mongoose.model<ISadaqahExpense>('SadaqahExpense', sadaqahExpenseSchema);
