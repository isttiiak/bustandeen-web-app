import 'dotenv/config';
import mongoose from 'mongoose';
import AdminAccount from '../models/AdminAccount.js';
import { resetMfa } from '../services/adminMfa.service.js';

/**
 * Last-resort recovery for an admin's second factor (T1.4): the Servant lost
 * both the authenticator and every backup code, so nobody can reach the
 * panel's own reset. Turns the account's TOTP off; at the next sign-in it
 * sets up a new authenticator. Any Ansar can be reset from the panel instead.
 *
 *   npm run admin:reset-mfa -- --email istiak@bustandeen.com            dry run
 *   npm run admin:reset-mfa -- --email istiak@bustandeen.com --apply    reset
 *
 * Reversible only by enrolling again (the old secret is gone). backend/.env
 * points at the LIVE database: --apply only with Istiak's yes.
 */

const APPLY = process.argv.includes('--apply');
const emailArg = process.argv[process.argv.indexOf('--email') + 1];

async function main(): Promise<void> {
  if (!process.argv.includes('--email') || !emailArg || emailArg.startsWith('--')) {
    throw new Error('Usage: --email <admin email> [--apply]');
  }
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(uri, { dbName: 'ihsan' });

  const email = emailArg.trim().toLowerCase();
  const account = await AdminAccount.findOne({ email });
  if (!account) throw new Error(`No admin account for ${email}`);
  process.stdout.write(
    `${account.email} (${account.role}${account.active ? '' : ', inactive'}): authenticator ${
      account.totpSecretEnc ? `on since ${account.totpEnabledAt?.toISOString() ?? '?'}` : 'off'
    }, ${account.backupCodeHashes?.length ?? 0} backup code(s) left\n`
  );

  if (!APPLY) {
    process.stdout.write('Dry run: nothing written. Re-run with --apply to reset.\n');
  } else if (!account.totpSecretEnc && !account.totpPendingSecretEnc) {
    process.stdout.write('Nothing to reset.\n');
  } else {
    await resetMfa(String(account._id));
    process.stdout.write('Reset: the next sign-in sets up a new authenticator.\n');
  }
  await mongoose.disconnect();
}

main().catch(async (err: unknown) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
