import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import SalatDebtEvent from '../src/models/SalatDebtEvent.js';
import KazaUnit from '../src/models/KazaUnit.js';
import CycleLog from '../src/models/CycleLog.js';
import SalatDebt from '../src/models/SalatDebt.js';
import * as debt from '../src/services/salatDebt.service.js';

// Audit 2026-11-16 P1-14: reads that loaded every row a person ever wrote.

let mongo;
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_bounded_reads' });
  await Promise.all([SalatDebtEvent.init(), KazaUnit.init(), CycleLog.init(), SalatDebt.init()]);
});
afterAll(async () => {
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect().catch(() => {});
  if (mongo) await mongo.stop();
});
afterEach(() => jest.restoreAllMocks());

const day = (end, back) => {
  const d = new Date(`${end}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
};

describe('debt history', () => {
  test('sums are computed by the database, not by loading every event, and match a plain recount', async () => {
    const uid = 'bh-hist';
    const end = '2026-06-30';
    const events = [];
    for (let i = 0; i < 40; i++) {
      events.push({ userId: uid, prayer: 'fajr', delta: 1, date: day(end, i) });
      events.push({ userId: uid, prayer: 'isha', delta: 2, date: day(end, i) });
      if (i % 3 === 0) events.push({ userId: uid, prayer: 'asr', delta: -1, date: day(end, i) });
    }
    await SalatDebtEvent.insertMany(events);
    const find = jest.spyOn(SalatDebtEvent, 'find');

    for (const days of [7, 30, 90]) {
      const weeks = await debt.getDebtHistory(uid, days, end);
      const start = day(end, days - 1);
      const inWindow = events.filter((e) => e.date >= start && e.date <= end);
      const plus = inWindow.filter((e) => e.delta > 0).reduce((s, e) => s + e.delta, 0);
      const minus = inWindow.filter((e) => e.delta < 0).reduce((s, e) => s - e.delta, 0);
      expect(weeks.reduce((s, w) => s + w.accumulated, 0)).toBe(plus);
      expect(weeks.reduce((s, w) => s + w.paidBack, 0)).toBe(minus);
    }
    expect(find).not.toHaveBeenCalled();
  });
});

describe('kaza insights', () => {
  test('stay correct, and stop at 20,000 units each way instead of loading everything', async () => {
    const uid = 'bh-insights';
    const owed = Array.from({ length: 20_050 }, (_, i) => ({
      userId: uid,
      prayer: 'fajr',
      missedDate: day('2026-01-01', i),
      status: 'owed',
    }));
    await KazaUnit.insertMany(owed, { ordered: false });
    const r = await debt.getKazaInsights(uid);
    expect(r.itemizedOwedCount).toBe(20_000);
    expect(r.oldestOwed.prayer).toBe('fajr');
  });
});

describe('releasing debt for rest days', () => {
  test('looks only at units that fall inside a rest interval, not at every owed unit', async () => {
    const uid = 'bh-release';
    await CycleLog.create({ userId: uid, startDate: '2026-03-10', endDate: '2026-03-15' });
    await SalatDebt.create({
      userId: uid,
      owed: { fajr: 3 },
      since: '2026-01-01',
      lastAccrualDate: '2026-03-30',
    });
    await KazaUnit.insertMany([
      { userId: uid, prayer: 'fajr', missedDate: '2026-02-01', status: 'owed' },
      { userId: uid, prayer: 'fajr', missedDate: '2026-03-12', status: 'owed' },
      { userId: uid, prayer: 'fajr', missedDate: '2026-03-25', status: 'owed' },
    ]);
    const find = jest.spyOn(KazaUnit, 'find');
    const released = await debt.releaseExcusedDebt(uid, '2026-03-30');
    expect(released).toBe(1);
    const filter = find.mock.calls[0][0];
    expect(JSON.stringify(filter)).toContain('missedDate');
    expect(
      (await KazaUnit.find({ userId: uid }).sort({ missedDate: 1 })).map((u) => u.missedDate)
    ).toEqual(['2026-02-01', '2026-03-25']);
  });
});
