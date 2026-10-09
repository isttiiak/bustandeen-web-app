import 'dotenv/config';
import { writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import admin from 'firebase-admin';
import mongoose from 'mongoose';
import { initFirebaseAdmin, isFirebaseInitialized } from '../config/firebaseAdmin.js';
import { purgeAccountData } from '../services/user.service.js';
import { ORPHAN_SOURCES, findOrphans } from './lib/orphanAccounts.js';

/**
 * Backfill for accounts deleted before v5.128.1: purge the rows they left
 * behind, exactly as deleteAccount does today (purgeAccountData).
 *
 *   npm run cleanup:orphans                dry run (default): counts only
 *   npm run cleanup:orphans -- --apply     back up, then purge
 *
 * --apply needs Firebase Admin credentials: a uid that still exists in
 * Firebase Auth is skipped, never purged. Before purging, every affected
 * document is written to a JSON backup in the OS temp folder (the only way
 * back, since a purge is a delete). backend/.env points at the LIVE
 * database: read the dry run first, and --apply only with Istiak's yes.
 */

const APPLY = process.argv.includes('--apply');

async function stillInFirebase(uid: string): Promise<boolean> {
  try {
    await admin.auth().getUser(uid);
    return true;
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === 'auth/user-not-found') return false;
    throw err;
  }
}

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(uri, { dbName: 'ihsan' });

  const report = await findOrphans();
  process.stdout.write(`Orphan uids (no User row): ${report.uids.length}\n`);
  for (const { label, docs } of report.counts) {
    if (docs > 0) process.stdout.write(`  ${label}: ${docs} document(s)\n`);
  }

  if (!APPLY) {
    process.stdout.write('Dry run: nothing written. Re-run with --apply to purge.\n');
    await mongoose.disconnect();
    return;
  }

  initFirebaseAdmin();
  if (!isFirebaseInitialized()) {
    throw new Error('--apply needs Firebase Admin credentials to skip live accounts');
  }
  const targets: string[] = [];
  for (const uid of report.uids) {
    if (await stillInFirebase(uid)) {
      process.stdout.write(`  skip ${uid}: still exists in Firebase Auth\n`);
    } else {
      targets.push(uid);
    }
  }

  const backup: { label: string; docs: unknown[] }[] = [];
  for (const { label, model, path } of ORPHAN_SOURCES) {
    backup.push({ label, docs: await model.find({ [path]: { $in: targets } }).lean() });
  }
  const file = join(tmpdir(), `bustandeen-orphans-${Date.now()}.json`);
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- path built here from tmpdir + a timestamp, no user input
  writeFileSync(file, JSON.stringify({ uids: targets, backup }, null, 2));
  process.stdout.write(`Backup written: ${file}\n`);

  for (const uid of targets) await purgeAccountData(uid);
  process.stdout.write(`Purged ${targets.length} orphan uid(s).\n`);
  await mongoose.disconnect();
}

main().catch(async (err: unknown) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
