import mongoose, { Document, Schema } from 'mongoose';

interface IZikrDaily extends Document {
  userId: string;
  date: Date;
  zikrType: string;
  count: number;
  createdAt: Date;
  updatedAt: Date;
}

const zikrDailySchema = new Schema<IZikrDaily>(
  {
    userId: { type: String, required: true },
    date: { type: Date, required: true },
    zikrType: { type: String, required: true },
    count: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

zikrDailySchema.index({ userId: 1, date: 1, zikrType: 1 }, { unique: true });

export default mongoose.model<IZikrDaily>('ZikrDaily', zikrDailySchema);
