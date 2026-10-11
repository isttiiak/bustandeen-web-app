import 'dotenv/config';
import { writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import admin from 'firebase-admin';
import mongoose from 'mongoose';
import { initFirebaseAdmin, isFirebaseInitialized } from '../config/firebaseAdmin.js';
import User from '../models/User.js';

/**
 * Email/password accounts that never confirmed their email, from before
 * email-first sign-up (v5.156.0). Since then the API refuses them anyway.
 *
 *   npm run cleanup:unverified                dry run (default): counts only
 *   npm run cleanup:unverified -- --apply     back up the list, then delete
 *
 * Deletes ONLY Firebase accounts older than --min-age-hours (default 48)
 * that have NO User document: they never reached the app, so nothing of
 * theirs exists in the database. Unverified accounts WITH a User document
 * (they used the app under the old "continue to app" flow) are listed and
 * kept: they still see "confirm your email" and can resend it.
 * backend/.env points at the LIVE project: --apply only with Istiak's yes.
 */

const APPLY = process.argv.includes('--apply');
const ageArg = process.argv.find((a) => a.startsWith('--min-age-hours='));
const MIN_AGE_HOURS = ageArg ? Number(ageArg.split('=')[1]) : 48;

const mask = (email: string): string => email.replace(/^(.).*(@.*)$/, '$1***$2');

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  initFirebaseAdmin();
  if (!isFirebaseInitialized()) throw new Error('Firebase Admin credentials are required');
  await mongoose.connect(uri, { dbName: 'ihsan' });

  const cutoff = Date.now() - MIN_AGE_HOURS * 3_600_000;
  const unverified: admin.auth.UserRecord[] = [];
  let pageToken: string | undefined;
  do {
    const page = await admin.auth().listUsers(1000, pageToken);
    for (const u of page.users) {
      const passwordOnly =
        u.providerData.length > 0 && u.providerData.every((p) => p.providerId === 'password');
      if (passwordOnly && !u.emailVerified) unverified.push(u);
    }
    pageToken = page.pageToken;
  } while (pageToken);

  const withUserDoc = new Set(
    (
      await User.find({ uid: { $in: unverified.map((u) => u.uid) } })
        .select('uid')
        .lean()
    ).map((u) => u.uid)
  );
  const old = unverified.filter((u) => new Date(u.metadata.creationTime).getTime() < cutoff);
  const targets = old.filter((u) => !withUserDoc.has(u.uid));
  const kept = unverified.filter((u) => withUserDoc.has(u.uid));

  process.stdout.write(`Unverified email/password accounts: ${unverified.length}\n`);
  process.stdout.write(`  with app data (kept, they see "confirm your email"): ${kept.length}\n`);
  for (const u of kept) process.stdout.write(`    keep ${mask(u.email ?? '?')}\n`);
  process.stdout.write(
    `  no app data and older than ${MIN_AGE_HOURS} h (to delete): ${targets.length}\n`
  );
  for (const u of targets) {
    process.stdout.write(
      `    delete ${mask(u.email ?? '?')} (created ${u.metadata.creationTime})\n`
    );
  }

  if (!APPLY) {
    process.stdout.write('Dry run: nothing deleted. Re-run with --apply to delete.\n');
    await mongoose.disconnect();
    return;
  }

  const file = join(tmpdir(), `bustandeen-unverified-${Date.now()}.json`);
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- path built here from tmpdir + a timestamp, no user input
  writeFileSync(
    file,
    JSON.stringify(
      targets.map((u) => ({ uid: u.uid, email: u.email, created: u.metadata.creationTime })),
      null,
      2
    )
  );
  process.stdout.write(`List written: ${file}\n`);
  for (const u of targets) await admin.auth().deleteUser(u.uid);
  process.stdout.write(`Deleted ${targets.length} Firebase account(s).\n`);
  await mongoose.disconnect();
}

main().catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
