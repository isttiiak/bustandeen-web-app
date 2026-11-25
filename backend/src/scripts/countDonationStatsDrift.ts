import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/mongo.js';
import { reportDonationStatsDrift } from './lib/donationStatsDrift.js';
import { DB_NAME } from '../config/database.js';

/**
 * READ-ONLY: do the cached public sadaqah totals match the verified donations?
 * (audit 2026-11-16 P1-9). Prints amounts and counts only, no donor data.
 *
 *   npm run audit:donation-stats
 *
 * backend/.env points at the LIVE database. Run it there only with Istiak's yes.
 */
async function run(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  const host = uri
    .replace(/^mongodb(\+srv)?:\/\//, '')
    .replace(/^[^@]*@/, '')
    .split(/[/?]/)[0];
  process.stdout.write(`READ-ONLY. Reading database "${DB_NAME}" on ${host}\n`);
  await connectDB();
  process.stdout.write(`${JSON.stringify(await reportDonationStatsDrift(), null, 2)}\n`);
}

run()
  .catch((err) => {
    console.error('failed:', (err as Error).message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
