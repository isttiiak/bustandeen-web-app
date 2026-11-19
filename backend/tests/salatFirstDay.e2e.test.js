import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import SalatDebt from '../src/models/SalatDebt.js';
import SalatLog from '../src/models/SalatLog.js';
import * as debt from '../src/services/salatDebt.service.js';

// Audit 2026-11-16 P1-16 (second item): a new debt record took its start and its
// sweep cursor from the SERVER's UTC date. For a person west of UTC the UTC date
// is already tomorrow when they first open the app in the evening, so their
// first day was marked "already swept" and never counted.

let mongo;
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_first_day' });
  await Promise.all([SalatDebt.init(), SalatLog.init()]);
});
afterAll(async () => {
  jest.useRealTimers();
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect().catch(() => {});
  if (mongo) await mongo.stop();
});

// Only the clock's date is faked: the database driver needs real timers.
const setClock = (iso) =>
  jest.useFakeTimers({
    now: new Date(iso),
    doNotFake: [
      'nextTick',
      'setImmediate',
      'setTimeout',
      'setInterval',
      'clearTimeout',
      'clearInterval',
      'queueMicrotask',
    ],
  });
const owed = async (uid) => {
  const d = await SalatDebt.findOne({ userId: uid });
  return Object.values(d.owed.toObject()).reduce((a, b) => a + b, 0);
};

describe('the first day of a new account', () => {
  test('west of UTC (UTC-5), opening in the evening: that first day is counted once it has passed', async () => {
    const uid = 'fd-west';
    // 20:00 on 20 Nov in UTC-5 is 01:00 on 21 Nov in UTC.
    setClock('2026-11-21T01:00:00Z');
    await debt.ensureCaughtUp(uid, '2026-11-20');
    // The next evening: nothing was logged on the 20th.
    setClock('2026-11-22T01:00:00Z');
    await debt.ensureCaughtUp(uid, '2026-11-21');
    expect(await owed(uid)).toBe(5); // all five prayers of 20 Nov
    expect((await SalatLog.findOne({ userId: uid, date: '2026-11-20' })).prayers.fajr.status).toBe(
      'missed'
    );
  });

  test('east of UTC (UTC+6) keeps counting its first day, as before', async () => {
    const uid = 'fd-east';
    setClock('2026-11-20T14:00:00Z'); // 20:00 local on the 20th
    await debt.ensureCaughtUp(uid, '2026-11-20');
    setClock('2026-11-21T14:00:00Z');
    await debt.ensureCaughtUp(uid, '2026-11-21');
    expect(await owed(uid)).toBe(5);
  });

  test("the start of the counting period is the person's own first day", async () => {
    const uid = 'fd-since';
    setClock('2026-11-21T01:00:00Z');
    await debt.ensureCaughtUp(uid, '2026-11-20');
    const d = await SalatDebt.findOne({ userId: uid });
    expect(d.since).toBe('2026-11-20');
    expect(d.lastAccrualDate).toBe('2026-11-19');
  });
});
