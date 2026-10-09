import 'dotenv/config';
import mongoose from 'mongoose';
import {
  type ProfileDoc,
  migrateSocialVisibility,
  revertSocialVisibility,
} from './lib/socialVisibilityMigration.js';

/**
 * T3.6: write an explicit friends visibility on every pre-T3.6 profile,
 * keeping what friends already saw (see lib/socialVisibilityMigration.ts).
 *
 *   npm run migrate:social-visibility                      dry run (default)
 *   npm run migrate:social-visibility -- --apply           write
 *   npm run migrate:social-visibility -- --revert          dry run of the revert
 *   npm run migrate:social-visibility -- --revert --apply  undo the migration
 *
 * backend/.env points at the LIVE database: read the dry run first.
 */

const APPLY = process.argv.includes('--apply');
const REVERT = process.argv.includes('--revert');

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(uri, { dbName: 'ihsan' });
  const col = mongoose.connection.collection<ProfileDoc>('socialprofiles');
  const report = REVERT
    ? await revertSocialVisibility(col, { apply: APPLY })
    : await migrateSocialVisibility(col, { apply: APPLY });
  const verb = APPLY ? 'Updated' : 'Would update (dry run)';
  process.stdout.write(
    REVERT
      ? `${verb}: ${report.reverted} migrated profiles back to no visibility
`
      : `${verb}: ${report.toHidden} → hidden, ${report.toDetail} → detail
`
  );
  await mongoose.disconnect();
}

main().catch(async (err: unknown) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
