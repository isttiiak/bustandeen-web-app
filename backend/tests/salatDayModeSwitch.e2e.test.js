import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import SalatDebt from '../src/models/SalatDebt.js';
import SalatLog from '../src/models/SalatLog.js';
import * as debt from '../src/services/salatDebt.service.js';
import * as salat from '../src/services/salat.service.js';

// Audit 2026-11-16 P1-16 (a): the app's "today" for salat is the tracking day
// (Fajr by default, midnight or Maghrib by choice), chosen on the device and
// sent with every call. This pins what the server does when a person changes
// that choice and "today" moves by a day, which was only reasoned about before:
// a day is counted once, a prayer logged on a day that was already counted as
// missed pays exactly one unit back, and going back to the earlier day counts
// nothing again.

let mongo;
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_mode_switch' });
  await Promise.all([SalatDebt.init(), SalatLog.init()]);
});
afterAll(async () => {
  jest.useRealTimers();
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect().catch(() => {});
  if (mongo) await mongo.stop();
});

const owed = async (uid) => {
  const d = await SalatDebt.findOne({ userId: uid });
  return Object.values(d.owed.toObject()).reduce((a, b) => a + b, 0);
};
const status = async (uid, date, prayer) =>
  (await SalatLog.findOne({ userId: uid, date })).prayers[prayer].status;

const D = '2026-11-24';
const E = '2026-11-25';
const F = '2026-11-26';

describe('changing the day-start mode moves "today" without double counting', () => {
  test('midnight to Fajr just after midnight: the day already counted is not counted again, and a prayer logged on it pays back once', async () => {
    const uid = 'ms-midnight-to-fajr';
    await debt.ensureCaughtUp(uid, D); // first open, today = D
    await debt.ensureCaughtUp(uid, E); // after midnight in midnight mode: D is counted
    expect(await owed(uid)).toBe(5);
    expect(await status(uid, D, 'isha')).toBe('missed');

    // Switched to Fajr mode before Fajr: today is D again.
    await debt.ensureCaughtUp(uid, D);
    expect(await owed(uid)).toBe(5);

    // Isha prayed at 1 AM belongs to D: logging it pays back one unit.
    await salat.updatePrayerStatus(uid, 'isha', 'completed', D);
    expect(await owed(uid)).toBe(4);

    // Fajr arrives (today = E): nothing is counted twice.
    await debt.ensureCaughtUp(uid, E);
    expect(await owed(uid)).toBe(4);
    expect(await status(uid, D, 'isha')).toBe('completed');
  });

  test('Fajr to midnight just after midnight: the closing day is counted, and logging its Isha under that day pays it back', async () => {
    const uid = 'ms-fajr-to-midnight';
    await debt.ensureCaughtUp(uid, E);
    await debt.ensureCaughtUp(uid, F); // today moves forward: E is counted
    expect(await owed(uid)).toBe(5);

    await salat.updatePrayerStatus(uid, 'isha', 'completed', E);
    expect(await owed(uid)).toBe(4);

    // Back to the earlier "today": counts nothing.
    await debt.ensureCaughtUp(uid, E);
    expect(await owed(uid)).toBe(4);
  });
});
