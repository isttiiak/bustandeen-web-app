import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as salatDebt from '../src/services/salatDebt.service.js';
import * as salatService from '../src/services/salat.service.js';
import CycleLog from '../src/models/CycleLog.js';
import KazaUnit from '../src/models/KazaUnit.js';
import SalatDebtEvent from '../src/models/SalatDebtEvent.js';
import SalatLog from '../src/models/SalatLog.js';
import SalatDebt from '../src/models/SalatDebt.js';

// Rest days (Rayhanah): salat is excused and never made up. Kaza must not
// accrue on those days, debt already added for them must be released, and the
// salat analytics must treat them as neutral (not missed, not a broken streak).

const iso = (offset) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};
const TODAY = iso(0);
// A debt counter whose automatic sweep last ran `back` days ago (so the next
// ensureCaughtUp call has that many past days to process).
const seedCounter = (userId, back) =>
  SalatDebt.create({ userId, since: iso(-back), lastAccrualDate: iso(-back - 1) });
const owedTotal = async (uid) => (await salatDebt.getDebtReadOnly(uid)).totalOwed;

let mongo;
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_salat_excused' });
});
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect().catch(() => {});
  }
  if (mongo) await mongo.stop();
});

describe('kaza accrual skips rest days', () => {
  const UID = 'excused-accrue';
  test('a 3-day cycle inside a 10-day gap adds no debt for those days', async () => {
    await CycleLog.create({ userId: UID, type: 'hayd', startDate: iso(-5), endDate: iso(-3) });
    await seedCounter(UID, 10);
    await salatDebt.ensureCaughtUp(UID, TODAY); // sweeps the 10 days before today
    // 10 days x 5 prayers, minus 3 rest days x 5
    expect(await owedTotal(UID)).toBe(35);
    const units = await KazaUnit.find({ userId: UID });
    expect(units).toHaveLength(35);
    expect(units.some((u) => [iso(-5), iso(-4), iso(-3)].includes(u.missedDate))).toBe(false);
  });
});

describe('debt already added for rest days is released', () => {
  const UID = 'excused-release';
  test('adding the cycle afterwards removes exactly its days, once', async () => {
    await seedCounter(UID, 10);
    await salatDebt.ensureCaughtUp(UID, TODAY);
    expect(await owedTotal(UID)).toBe(50); // no cycle known yet: all 10 days owed

    await CycleLog.create({ userId: UID, type: 'hayd', startDate: iso(-5), endDate: iso(-3) });
    await salatDebt.ensureCaughtUp(UID, TODAY);
    expect(await owedTotal(UID)).toBe(35);
    expect(await KazaUnit.countDocuments({ userId: UID, missedDate: iso(-4) })).toBe(0);
    // history chart entries for those days are gone too
    expect(await SalatDebtEvent.countDocuments({ userId: UID, date: iso(-4) })).toBe(0);
    // and the days' own logs no longer read "missed"
    const log = await SalatLog.findOne({ userId: UID, date: iso(-4) });
    expect(log.prayers.fajr.status).toBe('pending');

    // running it again changes nothing
    await salatDebt.ensureCaughtUp(UID, TODAY);
    await salatDebt.ensureCaughtUp(UID, TODAY);
    expect(await owedTotal(UID)).toBe(35);
  });

  test('concurrent calls release each unit only once', async () => {
    const CU = 'excused-concurrent';
    await seedCounter(CU, 6);
    await salatDebt.ensureCaughtUp(CU, TODAY);
    expect(await owedTotal(CU)).toBe(30);
    await CycleLog.create({ userId: CU, type: 'hayd', startDate: iso(-3), endDate: iso(-2) });
    await Promise.all([1, 2, 3, 4].map(() => salatDebt.releaseExcusedDebt(CU, TODAY)));
    expect(await owedTotal(CU)).toBe(20); // 30 - 2 days x 5, never lower
  });

  test('a rest-day unit from before a manual reset is removed without lowering the counter', async () => {
    const RU = 'excused-reset';
    await seedCounter(RU, 6);
    await salatDebt.ensureCaughtUp(RU, TODAY);
    expect(await owedTotal(RU)).toBe(30);
    await salatDebt.resetDebt(RU, iso(-2)); // counter to 0; old ledger entries remain
    await salatDebt.adjustDebt(RU, 'fajr', 3); // some fresh, unrelated debt
    await CycleLog.create({ userId: RU, type: 'hayd', startDate: iso(-5), endDate: iso(-5) });
    await salatDebt.releaseExcusedDebt(RU, TODAY);
    expect(await KazaUnit.countDocuments({ userId: RU, missedDate: iso(-5) })).toBe(0);
    expect(await owedTotal(RU)).toBe(3); // untouched
  });

  test('paid units and other days are left alone', async () => {
    const PU = 'excused-paid';
    await seedCounter(PU, 6);
    await salatDebt.ensureCaughtUp(PU, TODAY);
    // pay back one prayer that falls on a (soon to be) rest day
    await KazaUnit.updateOne(
      { userId: PU, prayer: 'fajr', missedDate: iso(-3) },
      { $set: { status: 'paid', paidAt: new Date() } }
    );
    await CycleLog.create({ userId: PU, type: 'hayd', startDate: iso(-3), endDate: iso(-3) });
    await salatDebt.releaseExcusedDebt(PU, TODAY);
    expect(await KazaUnit.countDocuments({ userId: PU, status: 'paid' })).toBe(1);
    expect(await KazaUnit.countDocuments({ userId: PU, missedDate: iso(-3), status: 'owed' })).toBe(
      0
    );
  });
});

describe('salat analytics treat rest days as neutral', () => {
  const UID = 'excused-analytics';
  test('a day with the cycle unlogged is not missed and does not break the streak', async () => {
    // Prayed all five on days -6,-5 and -1,0; days -4..-2 are a rest period with no logs.
    for (const back of [6, 5, 1, 0]) {
      for (const p of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']) {
        await salatService.updatePrayerStatus(UID, p, 'completed', iso(-back));
      }
    }
    await CycleLog.create({ userId: UID, type: 'hayd', startDate: iso(-4), endDate: iso(-2) });

    const a = await salatService.getSalatAnalytics(UID, 7, TODAY, undefined, iso(-6));
    expect(a.missedCount).toBe(0);
    expect(a.totalDays).toBe(4); // 7 days minus 3 rest days
    expect(a.totalPossiblePrayers).toBe(20);
    expect(a.completionRate).toBe(100);
    // Streak runs straight through the rest days: -6,-5,(rest),-1,0
    expect(a.currentStreak).toBe(4);
    expect(a.bestStreak).toBe(4);
    expect(a.perPrayer.fajr.currentStreak).toBe(4);
    expect(a.perPrayer.fajr.missed).toBe(0);
  });

  test('without a cycle the same gap is missed and breaks the streak (control)', async () => {
    const CTRL = 'excused-control';
    for (const back of [6, 5, 1, 0]) {
      for (const p of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']) {
        await salatService.updatePrayerStatus(CTRL, p, 'completed', iso(-back));
      }
    }
    const a = await salatService.getSalatAnalytics(CTRL, 7, TODAY, undefined, iso(-6));
    expect(a.missedCount).toBe(15);
    expect(a.currentStreak).toBe(2);
  });
});

describe('removing or shortening a cycle counts its days after all', () => {
  const allFive = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

  test('deleting a cycle that the sweep skipped brings its days back, once', async () => {
    const UID = 'excused-restore-delete';
    const cycle = await CycleLog.create({
      userId: UID,
      type: 'hayd',
      startDate: iso(-5),
      endDate: iso(-3),
    });
    await seedCounter(UID, 10);
    await salatDebt.ensureCaughtUp(UID, TODAY);
    expect(await owedTotal(UID)).toBe(35);

    await CycleLog.deleteOne({ _id: cycle._id });
    await salatDebt.ensureCaughtUp(UID, TODAY);
    expect(await owedTotal(UID)).toBe(50); // the 3 days x 5 are owed like any other day
    expect(await KazaUnit.countDocuments({ userId: UID, missedDate: iso(-4) })).toBe(5);

    // idempotent
    await salatDebt.ensureCaughtUp(UID, TODAY);
    await salatDebt.ensureCaughtUp(UID, TODAY);
    expect(await owedTotal(UID)).toBe(50);
  });

  test('shortening a cycle counts only the days it no longer covers', async () => {
    const UID = 'excused-restore-shorten';
    const cycle = await CycleLog.create({
      userId: UID,
      type: 'hayd',
      startDate: iso(-6),
      endDate: iso(-2),
    });
    await seedCounter(UID, 10);
    await salatDebt.ensureCaughtUp(UID, TODAY);
    expect(await owedTotal(UID)).toBe(25); // 5 rest days skipped

    await CycleLog.updateOne({ _id: cycle._id }, { $set: { endDate: iso(-5) } }); // now only 2 rest days
    await salatDebt.ensureCaughtUp(UID, TODAY);
    expect(await owedTotal(UID)).toBe(40); // 3 days came back (15 prayers)
    expect(await KazaUnit.countDocuments({ userId: UID, missedDate: iso(-6) })).toBe(0);
    expect(await KazaUnit.countDocuments({ userId: UID, missedDate: iso(-4) })).toBe(5);
  });

  test('days released after the fact (cycle added later) come back when it is deleted', async () => {
    const UID = 'excused-restore-released';
    await seedCounter(UID, 10);
    await salatDebt.ensureCaughtUp(UID, TODAY);
    expect(await owedTotal(UID)).toBe(50);
    const cycle = await CycleLog.create({
      userId: UID,
      type: 'hayd',
      startDate: iso(-5),
      endDate: iso(-4),
    });
    await salatDebt.ensureCaughtUp(UID, TODAY);
    expect(await owedTotal(UID)).toBe(40);
    await CycleLog.deleteOne({ _id: cycle._id });
    await salatDebt.ensureCaughtUp(UID, TODAY);
    expect(await owedTotal(UID)).toBe(50);
  });

  test('a prayer the user logged on a restored day is kept, not counted as missed', async () => {
    const UID = 'excused-restore-logged';
    const cycle = await CycleLog.create({
      userId: UID,
      type: 'hayd',
      startDate: iso(-3),
      endDate: iso(-3),
    });
    await seedCounter(UID, 6);
    await salatDebt.ensureCaughtUp(UID, TODAY);
    await salatService.updatePrayerStatus(UID, 'fajr', 'completed', iso(-3));
    await CycleLog.deleteOne({ _id: cycle._id });
    await salatDebt.ensureCaughtUp(UID, TODAY);
    const log = await SalatLog.findOne({ userId: UID, date: iso(-3) });
    expect(log.prayers.fajr.status).toBe('completed');
    expect(await KazaUnit.countDocuments({ userId: UID, missedDate: iso(-3) })).toBe(4);
  });

  test('concurrent calls restore each day only once', async () => {
    const UID = 'excused-restore-concurrent';
    const cycle = await CycleLog.create({
      userId: UID,
      type: 'hayd',
      startDate: iso(-4),
      endDate: iso(-3),
    });
    await seedCounter(UID, 6);
    await salatDebt.ensureCaughtUp(UID, TODAY);
    expect(await owedTotal(UID)).toBe(20);
    await CycleLog.deleteOne({ _id: cycle._id });
    await Promise.all([1, 2, 3, 4].map(() => salatDebt.restoreUncoveredDays(UID, TODAY)));
    expect(await owedTotal(UID)).toBe(30);
  });

  test('a counter created before the list existed is caught up on first use', async () => {
    const UID = 'excused-restore-legacy';
    // Simulate the state after the earlier release-only version: debt counted 40
    // (rest days already released), no remembered list, and the flag not set.
    await seedCounter(UID, 10);
    await SalatDebt.updateOne(
      { userId: UID },
      { $set: { restDaysSeeded: false, skippedRestDays: [], lastAccrualDate: iso(-1) } }
    );
    const cycle = await CycleLog.create({
      userId: UID,
      type: 'hayd',
      startDate: iso(-5),
      endDate: iso(-4),
    });
    await SalatDebt.updateOne(
      { userId: UID },
      {
        $set: { 'owed.fajr': 8, 'owed.dhuhr': 8, 'owed.asr': 8, 'owed.maghrib': 8, 'owed.isha': 8 },
      }
    );
    await salatDebt.restoreUncoveredDays(UID, TODAY); // seeds from the cycle that exists now
    await CycleLog.deleteOne({ _id: cycle._id });
    await salatDebt.restoreUncoveredDays(UID, TODAY);
    expect(await owedTotal(UID)).toBe(50); // 2 rest days x 5 came back
    expect(allFive.length).toBe(5);
  });
});
