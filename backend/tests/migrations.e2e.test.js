import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MIGRATIONS } from '../src/migrations/index.js';
import { runMigrations, VERSIONS_COLLECTION } from '../src/migrations/runner.js';
import { decryptJson, fieldContexts } from '../src/utils/fieldCrypto.js';

// Audit 2026-11-16 P3-2: the migration runner. A dry run changes nothing and
// records nothing; --apply does the work once; a second run finds nothing;
// data that is already in the new shape is never touched.

let mongo;
let db;
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_migrations' });
  db = mongoose.connection.db;
});
afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

const dump = async () =>
  JSON.stringify(
    await Promise.all(
      ['cycledays', 'zikraudioassets', 'globalzikrlibraryitems', VERSIONS_COLLECTION].map((c) =>
        db.collection(c).find().sort({ _id: 1 }).toArray()
      )
    )
  );

async function seed() {
  for (const c of ['cycledays', 'zikraudioassets', 'globalzikrlibraryitems', VERSIONS_COLLECTION]) {
    await db.collection(c).deleteMany({});
  }
  await db.collection('cycledays').insertMany([
    { userId: 'u1', date: '2026-11-01', flow: 'medium', symptoms: ['cramps'], mood: 'calm' },
    { userId: 'u1', date: '2026-11-02', moods: ['tired'], garden: ['rose'] },
    { userId: 'u2', date: '2026-11-03' }, // nothing legacy, nothing encrypted
    { userId: 'u3', date: '2026-11-04', enc: 'already-encrypted-blob' }, // new shape: must not move
  ]);
  await db.collection('zikraudioassets').insertMany([{ title: 'a' }, { title: 'b' }]);
  await db
    .collection('globalzikrlibraryitems')
    .insertMany([{ title: 'x', audioUrl: 'https://example.com/x.mp3' }, { title: 'y' }]);
}

describe('runMigrations', () => {
  it('a dry run counts what would change and writes nothing', async () => {
    await seed();
    const before = await dump();
    const results = await runMigrations(db, MIGRATIONS, { apply: false });
    expect(await dump()).toBe(before);
    expect(results).toEqual([
      {
        id: '001-cycle-day-encryption',
        status: 'would-apply',
        counts: { encrypted: 2, stamped: 1 },
      },
      {
        id: '002-remove-zikr-audio-links',
        status: 'would-apply',
        counts: { droppedDocuments: 2, libraryItems: 1 },
      },
    ]);
  });

  it('apply encrypts legacy cycle days, drops the audio data, and records both', async () => {
    await seed();
    const results = await runMigrations(db, MIGRATIONS, { apply: true });
    expect(results.map((r) => r.status)).toEqual(['applied', 'applied']);

    const days = await db.collection('cycledays').find().sort({ date: 1 }).toArray();
    expect(days[0].flow).toBeUndefined();
    expect(days[0].symptoms).toBeUndefined();
    expect(decryptJson(days[0].enc, fieldContexts.cycleDay('u1', '2026-11-01'))).toEqual({
      flow: 'medium',
      symptoms: ['cramps'],
      moods: ['calm'],
      garden: [],
    });
    expect(decryptJson(days[1].enc, fieldContexts.cycleDay('u1', '2026-11-02'))).toEqual({
      flow: null,
      symptoms: [],
      moods: ['tired'],
      garden: ['rose'],
    });
    expect(days[2].enc).toBeNull();
    expect(days[3].enc).toBe('already-encrypted-blob'); // untouched

    expect(await db.listCollections({ name: 'zikraudioassets' }).toArray()).toHaveLength(0);
    const items = await db.collection('globalzikrlibraryitems').find().sort({ title: 1 }).toArray();
    expect(items.map((i) => i.audioUrl)).toEqual([undefined, undefined]);

    const recorded = await db.collection(VERSIONS_COLLECTION).find().sort({ _id: 1 }).toArray();
    expect(recorded.map((r) => r._id)).toEqual([
      '001-cycle-day-encryption',
      '002-remove-zikr-audio-links',
    ]);
  });

  it('a second run skips what was applied and changes nothing', async () => {
    const before = await dump();
    const results = await runMigrations(db, MIGRATIONS, { apply: true });
    expect(results.map((r) => r.status)).toEqual(['already-applied', 'already-applied']);
    expect(await dump()).toBe(before);
  });

  it('is idempotent even without the record (the migration itself finds nothing)', async () => {
    await db.collection(VERSIONS_COLLECTION).deleteMany({});
    const before = await db.collection('cycledays').find().sort({ date: 1 }).toArray();
    const results = await runMigrations(db, MIGRATIONS, { apply: true });
    expect(results[0].counts).toEqual({ encrypted: 0, stamped: 0 });
    expect(results[1].counts).toEqual({ droppedDocuments: 0, libraryItems: 0 });
    expect(await db.collection('cycledays').find().sort({ date: 1 }).toArray()).toEqual(before);
  });

  it('stops at a failing migration and records nothing for it', async () => {
    await db.collection(VERSIONS_COLLECTION).deleteMany({});
    const ok = { id: '900-ok', description: 'ok', up: async () => ({ n: 1 }) };
    const bad = {
      id: '901-bad',
      description: 'bad',
      up: async () => {
        throw new Error('boom');
      },
    };
    const never = { id: '902-never', description: 'never', up: async () => ({}) };
    await expect(runMigrations(db, [ok, bad, never], { apply: true })).rejects.toThrow('boom');
    const ids = (await db.collection(VERSIONS_COLLECTION).find().toArray()).map((r) => r._id);
    expect(ids).toEqual(['900-ok']);
  });

  it('refuses duplicate ids', async () => {
    const m = { id: '1-x', description: '', up: async () => ({}) };
    await expect(runMigrations(db, [m, m], { apply: false })).rejects.toThrow(/Duplicate/);
  });
});
