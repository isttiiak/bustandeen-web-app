import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/mongo.js';
import { reportFutureAccrual } from './lib/futureAccrual.js';
import { DB_NAME } from '../config/database.js';

/**
 * READ-ONLY: how many accounts did the unbounded client "today" push into the
 * future (audit 2026-11-16 P0-3)? It writes nothing: no update, insert or
 * delete, and no index changes. It exists to size a repair before one is
 * designed.
 *
 *   npm run audit:future-accrual               counts only
 *   npm run audit:future-accrual -- --list     also prints the affected uids
 *                                              (uids only, no emails or names)
 *
 * backend/.env points at the LIVE database. Run it there only with Istiak's
 * yes; the first line it prints says which cluster and database it reads.
 * Requires MONGODB_URI (backend/.env).
 */

const LIST = process.argv.includes('--list');

async function run(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  // Host only: never print the credentials part of the URI.
  const host = uri
    .replace(/^mongodb(\+srv)?:\/\//, '')
    .replace(/^[^@]*@/, '')
    .split(/[/?]/)[0];
  process.stdout.write(`READ-ONLY. Reading database "${DB_NAME}" on ${host}\n`);

  await connectDB();
  const report = await reportFutureAccrual(Date.now(), { withUids: LIST });
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
