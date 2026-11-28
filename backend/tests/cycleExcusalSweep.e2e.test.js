import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import SalatDebt from '../src/models/SalatDebt.js';
import SalatDebtEvent from '../src/models/SalatDebtEvent.js';
import SalatLog from '../src/models/SalatLog.js';
import KazaUnit from '../src/models/KazaUnit.js';
import CycleLog from '../src/models/CycleLog.js';
import CycleProfile from '../src/models/CycleProfile.js';
import * as debtService from '../src/services/salatDebt.service.js';
import { getSalatAnalytics } from '../src/services/salat.service.js';
import { setClientDayBoundForTests } from '../src/validation/clientDay.js';

// Rayhanah, the start day and the end day of an episode: the kaza sweep and the
// analytics leave out exactly the prayers the episode excuses (utils/cycleExcusal.ts,
// GitHub issue 431 for the sources), and still count the others.

setClientDayBoundForTests(false);

let mongo;
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_cycle_excusal' });
  await Promise.all([SalatLog.init(), SalatDebt.init(), SalatDebtEvent.init(), KazaUnit.init()]);
});
afterAll(async () => {
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect().catch(() => {});
  if (mongo) await mongo.stop();
});

const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const owedBy = async (userId) => {
  const debt = await SalatDebt.findOne({ userId });
  return Object.fromEntries(PRAYERS.map((p) => [p, debt?.owed?.[p] ?? 0]));
};

// 10 Feb: starts in Asr time (not prayed, not enough time passed) ... 12 Feb: ends in Asr time with enough time left.
const episode = (userId) => ({
  userId,
  startDate: '2026-02-10',
  endDate: '2026-02-12',
  startMark: { slot: 'asr', prayed: false, enough: false },
  endMark: { slot: 'asr', enough: true },
});

async function setUp(userId, school) {
  await CycleProfile.create({ userId, madhab: school });
  await CycleLog.create(episode(userId));
  await SalatDebt.create({ userId, since: '2026-02-08', lastAccrualDate: '2026-02-08' });
}

describe('the kaza sweep on the start and end day of an episode', () => {
  test('majority: Fajr and Dhuhr before the start stay owed; the end day owes Dhuhr with Asr', async () => {
    await setUp('excusal-majority', 'majority');
    await debtService.ensureCaughtUp('excusal-majority', '2026-02-14');
    // 9 Feb: all five. 10 Feb (start): Fajr, Dhuhr. 11 Feb: none. 12 Feb (end): all but Fajr. 13 Feb: all five.
    expect(await owedBy('excusal-majority')).toEqual({
      fajr: 3,
      dhuhr: 4,
      asr: 3,
      maghrib: 3,
      isha: 3,
    });
  });

  test('Hanafi: the end day owes only the prayer she became pure in and the ones after it', async () => {
    await setUp('excusal-hanafi', 'hanafi');
    await debtService.ensureCaughtUp('excusal-hanafi', '2026-02-14');
    expect(await owedBy('excusal-hanafi')).toEqual({
      fajr: 3,
      dhuhr: 3,
      asr: 3,
      maghrib: 3,
      isha: 3,
    });
    // (the Hanafi end day owes Asr, Maghrib, Isha: Fajr and Dhuhr were excused)
  });

  test('an excused prayer is never written as "missed" in the log', async () => {
    const log = await SalatLog.findOne({ userId: 'excusal-majority', date: '2026-02-10' });
    expect(log.prayers.fajr.status).toBe('missed');
    expect(log.prayers.asr.status).toBe('pending');
    expect(log.prayers.isha.status).toBe('pending');
  });

  test('an episode with no answers excuses its whole start and end day, as before', async () => {
    await CycleLog.create({
      userId: 'excusal-old',
      startDate: '2026-02-10',
      endDate: '2026-02-12',
    });
    await SalatDebt.create({
      userId: 'excusal-old',
      since: '2026-02-08',
      lastAccrualDate: '2026-02-08',
    });
    await debtService.ensureCaughtUp('excusal-old', '2026-02-14');
    expect(await owedBy('excusal-old')).toEqual({ fajr: 2, dhuhr: 2, asr: 2, maghrib: 2, isha: 2 });
  });

  test('releasing debt an earlier sweep added: only the prayers the answers excuse are released', async () => {
    const u = 'excusal-late';
    await SalatDebt.create({ userId: u, since: '2026-02-08', lastAccrualDate: '2026-02-08' });
    // Swept before the episode was logged: the whole of 10 Feb counted as owed.
    await debtService.ensureCaughtUp(u, '2026-02-11');
    expect(await owedBy(u)).toEqual({ fajr: 2, dhuhr: 2, asr: 2, maghrib: 2, isha: 2 });
    await CycleProfile.create({ userId: u, madhab: 'majority' });
    await CycleLog.create(episode(u));
    await debtService.ensureCaughtUp(u, '2026-02-11');
    // 9 Feb stays (5); 10 Feb keeps Fajr and Dhuhr, loses Asr, Maghrib, Isha
    expect(await owedBy(u)).toEqual({ fajr: 2, dhuhr: 2, asr: 1, maghrib: 1, isha: 1 });
  });
});

describe('the analytics on the start and end day of an episode', () => {
  test('excused prayers are neither done nor missed, and the day can still read as full', async () => {
    const u = 'excusal-analytics';
    await CycleProfile.create({ userId: u, madhab: 'majority' });
    await CycleLog.create({
      userId: u,
      startDate: '2026-02-10',
      endDate: '2026-02-12',
      startMark: { slot: 'dhuhr', prayed: true },
      endMark: { slot: 'dhuhr', enough: true },
    });
    // The end day: Fajr is excused, the other four were prayed.
    await SalatLog.create({
      userId: u,
      date: '2026-02-12',
      prayers: {
        dhuhr: { status: 'completed' },
        asr: { status: 'completed' },
        maghrib: { status: 'completed' },
        isha: { status: 'completed' },
      },
    });
    const a = await getSalatAnalytics(u, 7, '2026-02-13');
    const day = a.calendarData.find((d) => d.date === '2026-02-12');
    expect(day.completed).toBe(5);
    expect(a.currentStreak).toBeGreaterThanOrEqual(1);
    // 7 days, 11 Feb fully excused: 6 days of 5 prayers, minus Asr, Maghrib and Isha of the
    // start day and Fajr of the end day.
    expect(a.totalDays).toBe(6);
    expect(a.totalPossiblePrayers).toBe(6 * 5 - 3 - 1);
  });
});
