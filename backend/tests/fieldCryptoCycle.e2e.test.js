import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import CycleDay from '../src/models/CycleDay.js';
import CycleProfile from '../src/models/CycleProfile.js';
import * as cycle from '../src/services/cycle.service.js';
import { encryptJson, fieldContext } from '../src/utils/fieldCrypto.js';

// Audit 2026-11-16 P2-3: a note that cannot be read (wrong or rotated key, a
// value copied from another row) must never be treated as an empty day and
// saved over.

let mongo;
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_field_crypto' });
});
afterAll(async () => {
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect().catch(() => {});
  if (mongo) await mongo.stop();
});

describe('Rayhanah notes that cannot be read', () => {
  test('saving a day on top of an unreadable note fails and leaves the note untouched', async () => {
    const date = '2026-03-01';
    // Another person's note copied onto this row: readable by the key, not by this row's context.
    const foreign = encryptJson(
      { flow: 'heavy', symptoms: ['x'], moods: [], garden: [] },
      fieldContext('cycleDay', 'someone-else', date)
    );
    await CycleDay.create({ userId: 'u-unreadable', date, enc: foreign });

    await expect(cycle.upsertDay('u-unreadable', { date, flow: 'light' })).rejects.toThrow();

    const row = await CycleDay.findOne({ userId: 'u-unreadable', date }).lean();
    expect(row.enc).toBe(foreign);
  });

  test('a normal save and read still works', async () => {
    const date = '2026-03-02';
    await cycle.upsertDay('u-ok', { date, flow: 'light', symptoms: ['a'] });
    await cycle.upsertDay('u-ok', { date, moods: ['calm'] });
    const row = await CycleDay.findOne({ userId: 'u-ok', date }).lean();
    expect(row.enc.startsWith('v2.')).toBe(true);
    const got = await cycle.upsertDay('u-ok', { date });
    expect(got).toMatchObject({ flow: 'light', symptoms: ['a'], moods: ['calm'] });
  });

  test('changing body stats on top of an unreadable value fails and keeps it', async () => {
    const foreign = encryptJson({ heightCm: 150 }, fieldContext('bodyStats', 'someone-else'));
    await CycleProfile.create({ userId: 'u-body', bodyStatsEncrypted: foreign });

    await expect(cycle.updateBodyStats('u-body', { weightKg: 60 })).rejects.toThrow();

    const p = await CycleProfile.findOne({ userId: 'u-body' }).lean();
    expect(p.bodyStatsEncrypted).toBe(foreign);
  });
});
