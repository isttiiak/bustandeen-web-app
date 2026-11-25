import 'dotenv/config';
import mongoose from 'mongoose';
import { MIGRATIONS } from '../migrations/index.js';
import { runMigrations } from '../migrations/runner.js';
import { connectScript } from './lib/connectScript.js';

/**
 * Runs the data migrations in src/migrations that this database has not seen.
 *
 *   npm run migrate                              dry run (default): counts only
 *   npm run migrate -- --apply                   write (a local database)
 *   npm run migrate -- --apply --production      write to a hosted database
 *
 * backend/.env points at the LIVE database: read the dry run first, and apply
 * only with the owner's yes. Idempotent; applied ids are kept in `schemaversions`.
 */

const APPLY = process.argv.includes('--apply');

async function main(): Promise<void> {
  await connectScript(APPLY);
  const db = mongoose.connection.db;
  if (!db) throw new Error('No database handle');
  const results = await runMigrations(db, MIGRATIONS, { apply: APPLY });
  for (const r of results) {
    process.stdout.write(`${r.id}: ${r.status} ${JSON.stringify(r.counts)}\n`);
  }
  if (!APPLY) process.stdout.write('Dry run: nothing written. Re-run with --apply.\n');
}

main()
  .catch((err: unknown) => {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
