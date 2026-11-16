import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import SalatDebt from '../src/models/SalatDebt.js';
import SalatDebtEvent from '../src/models/SalatDebtEvent.js';
import SalatLog from '../src/models/SalatLog.js';
import KazaUnit from '../src/models/KazaUnit.js';
import { reportFutureAccrual } from '../src/scripts/lib/futureAccrual.js';

// Audit 2026-11-16 P0-3 repair, step 1: the read-only count. It must find the
// accounts the unbounded client "today" pushed into the future, must not count
// real days near the boundary, and must write nothing.

const NOW = Date.parse('2026-11-16T12:00:00Z'); // UTC date 2026-11-16, latest possible today 2026-11-17
const day = (offset) =>
  new Date(Date.parse('2026-11-16T00:00:00Z') + offset * 86_400_000).toISOString().slice(0, 10);

let mongo;

const snapshot = async () =>
  JSON.stringify(
    await Promise.all(
      [SalatDebt, SalatDebtEvent, SalatLog, KazaUnit].map((m) => m.find().sort({ _id: 1 }).lean())
    )
  );

describe('reportFutureAccrual (read-only)', () => {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_future_accrual' });

    // A: cursor 5 days ahead, with the rows the sweep wrote for the empty days.
    await SalatDebt.create({ userId: 'A', lastAccrualDate: day(5) });
    await SalatDebtEvent.create([
      { userId: 'A', prayer: 'fajr', delta: 1, date: day(1) },
      { userId: 'A', prayer: 'fajr', delta: 1, date: day(2) },
      { userId: 'A', prayer: 'isha', delta: 1, date: day(4) },
    ]);
    await KazaUnit.create([
      { userId: 'A', prayer: 'fajr', missedDate: day(1), status: 'owed' },
      { userId: 'A', prayer: 'fajr', missedDate: day(2), status: 'owed' },
    ]);
    await SalatLog.create([{ userId: 'A', date: day(2) }]); // beyond day(1), impossible

    // B: ordinary account, yesterday's cursor and a real missed day.
    await SalatDebt.create({ userId: 'B', lastAccrualDate: day(-1) });
    await SalatDebtEvent.create({ userId: 'B', prayer: 'asr', delta: 1, date: day(-2) });

    // C: boundary. Cursor = the UTC date is valid; a log for tomorrow-UTC can be real.
    await SalatDebt.create({ userId: 'C', lastAccrualDate: day(0) });
    await SalatLog.create({ userId: 'C', date: day(1) });

    // D: normal cursor but an impossible kaza row: a cursor-only repair would miss it.
    await SalatDebt.create({ userId: 'D', lastAccrualDate: day(-1) });
    await KazaUnit.create({ userId: 'D', prayer: 'dhuhr', missedDate: day(3), status: 'owed' });

    // E: a far-future cursor (a forged year).
    await SalatDebt.create({ userId: 'E', lastAccrualDate: '2099-01-01' });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
    if (mongo) await mongo.stop();
  });

  test('counts only cursors after the UTC date, with the furthest one and how far ahead', async () => {
    const r = await reportFutureAccrual(NOW);
    expect(r.utcDate).toBe('2026-11-16');
    expect(r.latestPossibleToday).toBe('2026-11-17');
    expect(r.accountsWithFutureCursor).toBe(2); // A and E; B, C, D are fine
    expect(r.maxCursor).toBe('2099-01-01');
    expect(r.cursorsByDaysAhead).toEqual({ 1: 0, '2-7': 1, '8-30': 0, '31+': 1 });
  });

  test('counts the impossible rows the sweep left, and not the real ones', async () => {
    const r = await reportFutureAccrual(NOW);
    expect(r.impossibleRows).toEqual({
      debtEvents: 3,
      debtEventDeltaSum: 3,
      kazaUnits: 3, // A's two and D's one
      salatLogs: 1, // A's day(2); C's day(1) is the latest possible today and stays out
    });
  });

  test('finds accounts that have impossible rows but a normal cursor', async () => {
    const r = await reportFutureAccrual(NOW);
    expect(r.accountsWithRowsButNoFutureCursor).toBe(1); // D
  });

  test('lists uids only on request', async () => {
    expect((await reportFutureAccrual(NOW)).uids).toBeUndefined();
    expect((await reportFutureAccrual(NOW, { withUids: true })).uids).toEqual(['A', 'D', 'E']);
  });

  test('writes nothing', async () => {
    const before = await snapshot();
    await reportFutureAccrual(NOW, { withUids: true });
    expect(await snapshot()).toBe(before);
  });
});
