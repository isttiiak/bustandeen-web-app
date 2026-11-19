import crypto from 'crypto';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import CycleDay from '../src/models/CycleDay.js';
import { rewrapAll } from '../src/scripts/lib/rewrapFields.js';
import { encryptJson, decryptJson, fieldContexts, keyIdOf } from '../src/utils/fieldCrypto.js';

// Audit 2026-11-16 P2-3: the key-rotation step. Dry run by default, never
// touches a value it cannot read, never overwrites a save made meanwhile.

const legacy = (value, keyB64) => {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', Buffer.from(keyB64, 'base64'), iv);
  const ct = Buffer.concat([c.update(Buffer.from(JSON.stringify(value))), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), ct]).toString('base64');
};

let mongo;
const ORIGINAL = process.env.FIELD_ENCRYPTION_KEY;
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_rewrap' });
});
afterAll(async () => {
  process.env.FIELD_ENCRYPTION_KEY = ORIGINAL;
  delete process.env.FIELD_ENCRYPTION_KEY_PREVIOUS;
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect().catch(() => {});
  if (mongo) await mongo.stop();
});

const dayCounts = (counts) => counts.find((c) => c.field === 'CycleDay.enc');

test('dry run counts and writes nothing; apply moves old values to the new key', async () => {
  const oldKey = ORIGINAL;
  const ctx = (u, d) => fieldContexts.cycleDay(u, d);
  const preLegacy = legacy({ flow: 'a' }, oldKey);
  const preV2 = encryptJson({ flow: 'b' }, ctx('u1', '2026-04-02'));
  const foreign = encryptJson({ flow: 'c' }, ctx('someone', '2026-04-03'));
  await CycleDay.create([
    { userId: 'u1', date: '2026-04-01', enc: preLegacy },
    { userId: 'u1', date: '2026-04-02', enc: preV2 },
    { userId: 'u1', date: '2026-04-03', enc: foreign },
    { userId: 'u1', date: '2026-04-04', enc: null },
  ]);

  const newKey = crypto.randomBytes(32).toString('base64');
  process.env.FIELD_ENCRYPTION_KEY = newKey;
  process.env.FIELD_ENCRYPTION_KEY_PREVIOUS = oldKey;

  const dry = dayCounts(await rewrapAll({ apply: false }));
  expect(dry).toMatchObject({ scanned: 3, rewrapped: 2, unreadable: 1, alreadyCurrent: 0 });
  expect((await CycleDay.findOne({ date: '2026-04-01' }).lean()).enc).toBe(preLegacy);

  const done = dayCounts(await rewrapAll({ apply: true }));
  expect(done).toMatchObject({ rewrapped: 2, unreadable: 1 });

  const a = (await CycleDay.findOne({ date: '2026-04-01' }).lean()).enc;
  expect(a.startsWith(`v2.${keyIdOf(newKey)}.`)).toBe(true);
  expect(decryptJson(a, ctx('u1', '2026-04-01'))).toEqual({ flow: 'a' });
  expect((await CycleDay.findOne({ date: '2026-04-03' }).lean()).enc).toBe(foreign);

  // Retired key dropped: everything that was rewrapped still opens.
  delete process.env.FIELD_ENCRYPTION_KEY_PREVIOUS;
  expect(
    decryptJson(
      (await CycleDay.findOne({ date: '2026-04-02' }).lean()).enc,
      ctx('u1', '2026-04-02')
    )
  ).toEqual({ flow: 'b' });

  // Second apply has nothing left to do.
  expect(dayCounts(await rewrapAll({ apply: true }))).toMatchObject({
    rewrapped: 0,
    alreadyCurrent: 2,
    unreadable: 1,
  });
});
