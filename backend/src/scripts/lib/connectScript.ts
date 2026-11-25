import mongoose from 'mongoose';
import { DB_NAME, assertWriteAllowed, mongoHost } from '../../config/database.js';

/**
 * Connects an operator script to the database and says where, first.
 * `apply` is whether the run will write: a write against a hosted database
 * needs `--production` (config/database.ts). Dry runs connect freely.
 */
export async function connectScript(
  apply: boolean,
  opts: { autoIndex?: boolean } = {}
): Promise<string> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  assertWriteAllowed(uri, apply, process.argv);
  const host = mongoHost(uri);
  process.stdout.write(
    `${apply ? 'APPLYING' : 'DRY RUN (no writes)'}. Database "${DB_NAME}" on ${host}\n`
  );
  await mongoose.connect(uri, { dbName: DB_NAME, autoIndex: opts.autoIndex ?? false });
  return host;
}
