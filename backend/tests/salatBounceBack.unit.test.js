import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import SalatLog from '../src/models/SalatLog.js';
import CycleLog from '../src/models/CycleLog.js';
import { getBounceBack } from '../src/services/salat.service.js';

// "How you recover" reads only the Done / Kaza / Miss marks, never the time a
// button was tapped. These tests write SalatLog documents directly.

const UID = 'bounce-1';
const day = (n) => new Date(Date.UTC(2026, 0, 1 + n)).toISOString().slice(0, 10);
const full = {
  fajr: 'completed',
  dhuhr: 'completed',
  asr: 'kaza',
  maghrib: 'completed',
  isha: 'completed',
};
const slip = { ...full, asr: 'missed' };
const logDay = (n, status, userId = UID) =>
  SalatLog.create({
    userId,
    date: day(n),
    prayers: Object.fromEntries(Object.entries(status).map(([k, v]) => [k, { status: v }])),
  });

let mongo;

describe('Salat: how you recover after a missed prayer', () => {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_bounce' });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
    if (mongo) await mongo.stop();
  });

  test('nothing logged: not available', async () => {
    const r = await getBounceBack('nobody', day(40));
    expect(r).toMatchObject({ available: false, afterSlipRate: null, afterFullRate: null });
  });

  test('rates come from the marks, finished days only', async () => {
    // F = all five done, S = a missed prayer. Day 14 is never logged (a missed day) and today is day 15.
    const pattern = 'FFFFFFFSFSSFSF';
    for (let i = 0; i < pattern.length; i++) await logDay(i, pattern[i] === 'F' ? full : slip);
    const r = await getBounceBack(UID, day(15));
    // Full days: 0-6, 8, 11, 13 (10 days). Six of them were followed by a full day (0-5).
    expect(r.afterFullDays).toBe(10);
    expect(r.afterFullRate).toBe(60);
    // Slip days: 7, 9, 10, 12 (4 days). Three were followed by a full day (8, 11, 13).
    expect(r.afterSlipDays).toBe(4);
    expect(r.afterSlipRate).toBe(75);
    // Four slip days are too few to say anything yet
    expect(r.available).toBe(false);
  });

  test('available once both sides have five days; rest days are left out', async () => {
    const other = 'bounce-2';
    // 6 slip days each followed by a full day, then 6 full days
    for (let i = 0; i < 12; i++) await logDay(i, i % 2 === 0 && i < 12 ? slip : full, other);
    for (let i = 12; i < 18; i++) await logDay(i, full, other);
    const before = await getBounceBack(other, day(18));
    expect(before.available).toBe(true);
    expect(before.afterSlipRate).toBe(100);

    // A Rayhanah episode over days 0-3 takes those pairs out of both counts
    await CycleLog.create({ userId: other, startDate: day(0), endDate: day(3) });
    const after = await getBounceBack(other, day(18));
    expect(after.afterSlipDays).toBe(before.afterSlipDays - 2);
  });
});
