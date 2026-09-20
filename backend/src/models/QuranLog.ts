import mongoose, { Schema, Document } from 'mongoose';

export interface IQuranLog extends Document {
  userId: string;
  /** Local civil date, client-authoritative */
  date: string;
  /** Pages read that day (accumulated; standard 604-page mushaf) */
  pages: number;
  /** Ayat read that day (v4 ayah engine; 1 page ≈ 10 ayat for unit math) */
  ayat: number;
  /** Active reading seconds that day, rolled up from QuranReadingSession */
  durationSec: number;
  createdAt: Date;
  updatedAt: Date;
}

const quranLogSchema = new Schema<IQuranLog>(
  {
    userId: { type: String, required: true },
    date: { type: String, required: true },
    pages: { type: Number, default: 0, min: 0, max: 700 },
    ayat: { type: Number, default: 0, min: 0, max: 7000 },
    durationSec: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

quranLogSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model<IQuranLog>('QuranLog', quranLogSchema);
