import 'dotenv/config';
import mongoose from 'mongoose';
import { encryptJson, fieldContexts } from '../utils/fieldCrypto.js';

/**
 * One-time migration: encrypts any CycleDay documents still holding
 * plaintext flow/symptoms/moods/garden/mood fields (pre-encryption schema)
 * into the new `enc` blob, then strips the plaintext fields.
 *
 * Idempotent — safe to re-run; only touches docs missing `enc`. Talks to the
 * raw collection (not the Mongoose model) so it works regardless of which
 * schema shape is currently loaded in code.
 *
 * Usage:  npx tsx src/scripts/migrateCycleEncryption.ts
 * Requires MONGODB_URI and FIELD_ENCRYPTION_KEY in backend/.env.
 */

interface LegacyCycleDay {
  _id: mongoose.Types.ObjectId;
  userId: string;
  date: string;
  flow?: string | null;
  symptoms?: string[];
  moods?: string[];
  mood?: string | null;
  garden?: string[];
  enc?: string | null;
}

async function migrate(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  await mongoose.connect(uri);
  const col = mongoose.connection.collection<LegacyCycleDay>('cycledays');

  const cursor = col.find({ enc: { $exists: false } });
  let migrated = 0;
  let skipped = 0;

  for await (const doc of cursor) {
    const hasLegacyFields =
      doc.flow !== undefined ||
      doc.symptoms !== undefined ||
      doc.moods !== undefined ||
      doc.mood !== undefined ||
      doc.garden !== undefined;

    if (!hasLegacyFields) {
      // Empty doc with neither enc nor legacy fields — just stamp enc: null.
      await col.updateOne({ _id: doc._id }, { $set: { enc: null } });
      skipped++;
      continue;
    }

    const content = {
      flow: doc.flow ?? null,
      symptoms: doc.symptoms ?? [],
      moods: doc.moods?.length ? doc.moods : doc.mood ? [doc.mood] : [],
      garden: doc.garden ?? [],
    };

    await col.updateOne(
      { _id: doc._id },
      {
        $set: {
          enc: encryptJson(content, fieldContexts.cycleDay(String(doc.userId), String(doc.date))),
        },
        $unset: { flow: '', symptoms: '', moods: '', mood: '', garden: '' },
      }
    );
    migrated++;
  }

  console.warn(
    `Migrated ${migrated} CycleDay document(s); ${skipped} already-empty doc(s) stamped.`
  );
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
