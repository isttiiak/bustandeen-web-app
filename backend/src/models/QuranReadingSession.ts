import mongoose, { Schema, Document } from 'mongoose';

/**
 * One document per reading visit to the Reader page (not a raw event log like
 * ZikrEvent — Quran reading is one continuous activity per visit, so the
 * client tracks a single session and upserts it periodically by
 * `clientSessionId`, idempotent on retry). `activeDurationSec` excludes time
 * the tab was hidden or the reader was idle — see useQuranReadingSession on
 * the frontend for how that's measured.
 */
export interface IQuranReadingSession extends Document {
  userId: string;
  clientSessionId: string;
  /** Tracking day (Fajr/Maghrib-aware, client-authoritative) the session started in */
  date: string;
  startedAt: Date;
  endedAt: Date;
  activeDurationSec: number;
  ayahCount: number;
  pagesRead: number;
  surahs: number[];
  /** 'read' (the ayah-by-ayah Reader) or 'listen' (the audio player) — same
   * collection so both show up together in session history, distinguished
   * only by this tag. Defaults 'read' so pre-existing rows stay valid. */
  source: 'read' | 'listen';
  createdAt: Date;
  updatedAt: Date;
}

const quranReadingSessionSchema = new Schema<IQuranReadingSession>(
  {
    userId: { type: String, required: true },
    clientSessionId: { type: String, required: true },
    date: { type: String, required: true },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, required: true },
    activeDurationSec: { type: Number, default: 0, min: 0, max: 6 * 3600 },
    ayahCount: { type: Number, default: 0, min: 0, max: 7000 },
    pagesRead: { type: Number, default: 0, min: 0, max: 700 },
    surahs: { type: [Number], default: [] },
    source: { type: String, enum: ['read', 'listen'], default: 'read' },
  },
  { timestamps: true }
);

quranReadingSessionSchema.index({ userId: 1, clientSessionId: 1 }, { unique: true });
quranReadingSessionSchema.index({ userId: 1, date: 1 });

export default mongoose.model<IQuranReadingSession>(
  'QuranReadingSession',
  quranReadingSessionSchema
);
