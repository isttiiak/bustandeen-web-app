import 'dotenv/config';
import mongoose from 'mongoose';

/**
 * One-time cleanup after the admin "Zikr audio tracker" was removed: drops the
 * `zikraudioassets` collection and unsets the `audioUrl` field on every
 * community-library item (both were paste-a-link fields that nothing in the
 * app ever played). Idempotent — safe to re-run.
 *
 * Usage:  npx tsx src/scripts/removeZikrAudioLinks.ts
 * Requires MONGODB_URI in backend/.env.
 */
async function run(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  await mongoose.connect(uri, { dbName: 'ihsan' });
  const db = mongoose.connection.db;
  if (!db) throw new Error('No database handle');

  const assets = await db.listCollections({ name: 'zikraudioassets' }).toArray();
  if (assets.length > 0) {
    const n = await db.collection('zikraudioassets').countDocuments();
    await db.collection('zikraudioassets').drop();
    process.stdout.write(`Dropped zikraudioassets (${n} documents)\n`);
  } else {
    process.stdout.write('zikraudioassets not present — nothing to drop\n');
  }

  const res = await db
    .collection('globalzikrlibraryitems')
    .updateMany({ audioUrl: { $exists: true } }, { $unset: { audioUrl: '' } });
  process.stdout.write(`Unset audioUrl on ${res.modifiedCount} library item(s)\n`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
