import mongoose, { Schema, Document } from 'mongoose';

/**
 * Optional per-day wellness note during a cycle — flow intensity, symptoms,
 * mood. Purely private (same hard rule as CycleLog: never exposed through any
 * social endpoint). One row per user per local day.
 *
 * The content itself (flow/symptoms/moods/garden) is never queried, sorted,
 * or indexed on — only read/written whole by cycle.service.ts — so it is
 * stored as a single AES-256-GCM blob (`enc`, see utils/fieldCrypto.ts)
 * rather than plaintext fields, keeping it unreadable to anyone with raw
 * DB/Atlas access. `date` stays plaintext since it drives the unique index.
 */
export const CYCLE_FLOWS = ['light', 'medium', 'heavy'] as const;
export const CYCLE_SYMPTOMS = [
  'cramps',
  'headache',
  'fatigue',
  'nausea',
  'backache',
  'bloating',
  'tenderness',
  'insomnia',
] as const;
export const CYCLE_MOODS = ['calm', 'happy', 'low', 'irritable', 'anxious', 'tired'] as const;

/** Shape of the decrypted payload carried inside `enc`. */
export interface ICycleDayContent {
  flow: (typeof CYCLE_FLOWS)[number] | null;
  symptoms: string[];
  moods: string[];
  /** Garden of Light checklist — ids of completed items for the day. */
  garden: string[];
}

interface ICycleDay extends Document {
  userId: string;
  date: string; // YYYY-MM-DD (local, client-authoritative)
  /** AES-256-GCM ciphertext of ICycleDayContent; null when no note logged yet. */
  enc: string | null;
}

const CycleDaySchema = new Schema<ICycleDay>(
  {
    userId: { type: String, required: true, index: true },
    date: { type: String, required: true },
    enc: { type: String, default: null },
  },
  { timestamps: true }
);

CycleDaySchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model<ICycleDay>('CycleDay', CycleDaySchema);
