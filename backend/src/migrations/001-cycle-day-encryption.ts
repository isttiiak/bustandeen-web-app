import type mongoose from 'mongoose';
import { encryptJson, fieldContexts } from '../utils/fieldCrypto.js';
import type { Migration } from './runner.js';

/**
 * Encrypts any CycleDay still holding plaintext flow/symptoms/moods/garden/mood
 * (the pre-encryption schema) into the `enc` blob, then strips the plaintext.
 * A document with neither `enc` nor legacy fields is stamped `enc: null`.
 *
 * Only documents missing `enc` are touched, so a second run finds nothing.
 * Apply needs FIELD_ENCRYPTION_KEY; a dry run does not.
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

export const cycleDayEncryption: Migration = {
  id: '001-cycle-day-encryption',
  description: 'Encrypt legacy plaintext CycleDay fields into enc',
  async up({ db, apply }) {
    const col = db.collection<LegacyCycleDay>('cycledays');
    let encrypted = 0;
    let stamped = 0;

    for await (const doc of col.find({ enc: { $exists: false } })) {
      const hasLegacyFields =
        doc.flow !== undefined ||
        doc.symptoms !== undefined ||
        doc.moods !== undefined ||
        doc.mood !== undefined ||
        doc.garden !== undefined;

      if (!hasLegacyFields) {
        if (apply) await col.updateOne({ _id: doc._id }, { $set: { enc: null } });
        stamped++;
        continue;
      }

      if (apply) {
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
              enc: encryptJson(
                content,
                fieldContexts.cycleDay(String(doc.userId), String(doc.date))
              ),
            },
            $unset: { flow: '', symptoms: '', moods: '', mood: '', garden: '' },
          }
        );
      }
      encrypted++;
    }
    return { encrypted, stamped };
  },
};
