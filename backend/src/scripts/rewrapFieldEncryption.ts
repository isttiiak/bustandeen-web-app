import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/mongo.js';
import { rewrapAll } from './lib/rewrapFields.js';
import { DB_NAME, assertWriteAllowed } from '../config/database.js';

/**
 * Re-seals encrypted fields (Rayhanah notes and body stats, admin authenticator
 * secrets) under the current FIELD_ENCRYPTION_KEY in the v2 format (audit 2026-11-16 P2-3). Key rotation, in order:
 *   1. set the NEW key as FIELD_ENCRYPTION_KEY and the old one as
 *      FIELD_ENCRYPTION_KEY_PREVIOUS (both deployed; everything still opens);
 *   2. npm run rotate:field-key              (dry run: counts only)
 *   3. npm run rotate:field-key -- --apply   (only with Istiak's yes)
 *   4. when "unreadable" is 0 and nothing is left to rewrap, drop the old key.
 *
 * backend/.env points at the LIVE database; the first line says which one.
 * Nothing is printed except counts.
 */

const APPLY = process.argv.includes('--apply');

async function run(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  assertWriteAllowed(uri, APPLY, process.argv);
  const host = uri
    .replace(/^mongodb(\+srv)?:\/\//, '')
    .replace(/^[^@]*@/, '')
    .split(/[/?]/)[0];
  process.stdout.write(
    `${APPLY ? 'APPLYING' : 'DRY RUN (no writes)'}. Database "${DB_NAME}" on ${host}\n`
  );
  await connectDB();
  const counts = await rewrapAll({ apply: APPLY });
  process.stdout.write(`${JSON.stringify(counts, null, 2)}\n`);
}

run()
  .catch((err) => {
    console.error('failed:', (err as Error).message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
