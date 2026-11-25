import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/mongo.js';
import { reportOpenCycles } from './lib/openCycles.js';
import { DB_NAME } from '../config/database.js';

/**
 * READ-ONLY: does any account have more than one open cycle? (audit 2026-11-16
 * P1-8). Run before `npm run sync-indexes -- --apply`, which builds the unique
 * index `one_open_cycle_per_user`; the build fails while one exists.
 *
 *   npm run audit:open-cycles            counts only
 *   npm run audit:open-cycles -- --list  also prints the uids (uids only)
 *
 * backend/.env points at the LIVE database. Run it there only with Istiak's
 * yes; the first line it prints says which cluster and database it reads.
 */

const LIST = process.argv.includes('--list');

async function run(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  const host = uri
    .replace(/^mongodb(\+srv)?:\/\//, '')
    .replace(/^[^@]*@/, '')
    .split(/[/?]/)[0];
  process.stdout.write(`READ-ONLY. Reading database "${DB_NAME}" on ${host}\n`);

  await connectDB();
  const report = await reportOpenCycles({ withUids: LIST });
  const { uids, ...counts } = report;
  process.stdout.write(`${JSON.stringify(counts, null, 2)}\n`);
  if (uids) process.stdout.write(`uids (${uids.length}):\n${uids.join('\n')}\n`);
}

run()
  .catch((err) => {
    console.error('failed:', (err as Error).message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
