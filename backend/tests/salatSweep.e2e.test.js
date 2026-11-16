import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { setClientDayBoundForTests } from '../src/validation/clientDay.js';
import SalatDebt from '../src/models/SalatDebt.js';
import SalatDebtEvent from '../src/models/SalatDebtEvent.js';
import SalatLog from '../src/models/SalatLog.js';
import KazaUnit from '../src/models/KazaUnit.js';
import * as debtService from '../src/services/salatDebt.service.js';

// Audit 2026-11-16 P1-2: the day-rollover sweep moved its cursor BEFORE doing
// the work, so a failure part-way lost that window's debt for good, and a
// failed kaza-unit insert was swallowed. It now works in chunks, each one a
// transaction that moves the cursor only when the chunk's work has landed.

setClientDayBoundForTests(false);

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

let mongo;
beforeAll(async () => {
  process.env.DEV_AUTH_BYPASS = '1';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_salat_sweep' });
  await Promise.all([SalatLog.init(), SalatDebt.init(), SalatDebtEvent.init(), KazaUnit.init()]);
});
afterAll(async () => {
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect().catch(() => {});
  if (mongo) await mongo.stop();
});
afterEach(() => jest.restoreAllMocks());

let n = 0;
const newUser = () => `sweep${++n}`;
const seed = (userId, cursor) =>
  SalatDebt.create({ userId, since: cursor, lastAccrualDate: cursor });
const state = async (userId) => {
  const debt = await SalatDebt.findOne({ userId });
  return {
    cursor: debt?.lastAccrualDate,
    owed: PRAYERS.reduce((sum, p) => sum + (debt?.owed?.[p] ?? 0), 0),
    logs: await SalatLog.countDocuments({ userId }),
    events: await SalatDebtEvent.countDocuments({ userId }),
    units: await KazaUnit.countDocuments({ userId, status: 'owed' }),
  };
};
const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const failOnceAfter = (model, method, okCalls) => {
  const real = model[method].bind(model);
  let calls = 0;
  return jest.spyOn(model, method).mockImplementation((...args) => {
    if (calls++ < okCalls) return real(...args);
    return Promise.reject(new Error('boom'));
  });
};

describe('sweep: nothing is lost when it fails', () => {
  test('a failure after the work began leaves the cursor, logs and debt untouched, and a retry counts once', async () => {
    const u = newUser();
    await seed(u, '2026-01-01');
    // 2026-01-02 .. 2026-01-10: nine days, 45 prayers
    const spy = failOnceAfter(SalatDebtEvent, 'insertMany', 0);
    await expect(debtService.ensureCaughtUp(u, '2026-01-11')).rejects.toThrow('boom');
    expect(await state(u)).toEqual({ cursor: '2026-01-01', owed: 0, logs: 0, events: 0, units: 0 });

    spy.mockRestore();
    await debtService.ensureCaughtUp(u, '2026-01-11');
    expect(await state(u)).toEqual({
      cursor: '2026-01-10',
      owed: 45,
      logs: 9,
      events: 45,
      units: 45,
    });
  });

  test('a long gap goes in chunks: finished chunks stay, the failed one retries, no day twice', async () => {
    const u = newUser();
    const chunk = debtService.SWEEP_CHUNK_DAYS;
    await seed(u, '2026-01-01');
    // 100 days: 2026-01-02 .. 2026-04-11
    const spy = failOnceAfter(SalatDebtEvent, 'insertMany', 1);
    await expect(debtService.ensureCaughtUp(u, '2026-04-12')).rejects.toThrow('boom');
    const mid = await state(u);
    expect(mid.owed).toBe(chunk * 5);
    expect(mid.logs).toBe(chunk);
    expect(mid.cursor).toBe(new Date(Date.UTC(2026, 0, 1 + chunk)).toISOString().substring(0, 10));

    spy.mockRestore();
    await debtService.ensureCaughtUp(u, '2026-04-12');
    expect(await state(u)).toEqual({
      cursor: '2026-04-11',
      owed: 500,
      logs: 100,
      events: 500,
      units: 500,
    });
  });

  test('a kaza-unit write that fails is no longer swallowed, and rolls the chunk back', async () => {
    const u = newUser();
    await seed(u, '2026-01-01');
    jest.spyOn(KazaUnit, 'bulkWrite').mockRejectedValueOnce(new Error('units failed'));
    await expect(debtService.ensureCaughtUp(u, '2026-01-06')).rejects.toThrow('units failed');
    expect(await state(u)).toEqual({ cursor: '2026-01-01', owed: 0, logs: 0, events: 0, units: 0 });
  });

  test('a failure on the last step rolls back everything the chunk wrote, events and units too', async () => {
    const u = newUser();
    await seed(u, '2026-01-01');
    failOnceAfter(SalatDebt, 'updateOne', 0); // the final "add to owed"
    await expect(debtService.ensureCaughtUp(u, '2026-01-06')).rejects.toThrow('boom');
    expect(await state(u)).toEqual({ cursor: '2026-01-01', owed: 0, logs: 0, events: 0, units: 0 });
  });

  test('a unit that already exists for a swept day does not break the sweep or double up', async () => {
    const u = newUser();
    await seed(u, '2026-01-01');
    await KazaUnit.create({ userId: u, prayer: 'fajr', missedDate: '2026-01-03', status: 'owed' });
    await debtService.ensureCaughtUp(u, '2026-01-06'); // 2026-01-02 .. 01-05: 20 prayers
    const s = await state(u);
    expect(s.owed).toBe(20);
    expect(s.units).toBe(20);
  });
});

describe('sweep: concurrency', () => {
  test('six sweeps at once count the window exactly once', async () => {
    const u = newUser();
    await seed(u, '2026-01-01');
    await Promise.all(Array.from({ length: 6 }, () => debtService.ensureCaughtUp(u, '2026-01-11')));
    expect(await state(u)).toEqual({
      cursor: '2026-01-10',
      owed: 45,
      logs: 9,
      events: 45,
      units: 45,
    });
  });

  test('a prayer logged by the person while the sweep runs is kept, not overwritten', async () => {
    const u = newUser();
    await seed(u, '2026-01-01');
    await SalatLog.create({
      userId: u,
      date: '2026-01-04',
      prayers: { fajr: { status: 'completed' } },
    });
    await debtService.ensureCaughtUp(u, '2026-01-06');
    const log = await SalatLog.findOne({ userId: u, date: '2026-01-04' });
    expect(log.prayers.fajr.status).toBe('completed');
    expect(log.prayers.dhuhr.status).toBe('missed');
    expect((await state(u)).owed).toBe(19);
  });
});

describe('sweep: a failure does not break the screen', () => {
  test('GET /api/salat/debt still answers 200 and the next request retries', async () => {
    const u = newUser();
    const token = fakeJwt({ uid: u, email: `${u}@test.dev`, name: u });
    const auth = (r) => r.set('Authorization', `Bearer ${token}`);
    await seed(u, '2026-01-01');
    jest.spyOn(console, 'error').mockImplementation(() => {});
    failOnceAfter(SalatDebtEvent, 'insertMany', 0);
    const res = await auth(request(app).get('/api/salat/debt?today=2026-01-11'));
    expect(res.status).toBe(200);
    expect(res.body.totalOwed).toBe(0);
    expect((await state(u)).cursor).toBe('2026-01-01');

    jest.restoreAllMocks();
    const again = await auth(request(app).get('/api/salat/debt?today=2026-01-11'));
    expect(again.status).toBe(200);
    expect(again.body.totalOwed).toBe(45);
  });
});

describe('restoring rest days: one transaction per day', () => {
  test('a failure while counting a restored day keeps the day remembered, and the retry counts it once', async () => {
    const u = newUser();
    await SalatDebt.create({
      userId: u,
      since: '2026-01-01',
      lastAccrualDate: '2026-01-10',
      restDaysSeeded: true,
      skippedRestDays: ['2026-01-05'],
    });
    failOnceAfter(SalatDebt, 'findOneAndUpdate', 0);
    await expect(debtService.restoreUncoveredDays(u, '2026-01-11')).rejects.toThrow('boom');
    let debt = await SalatDebt.findOne({ userId: u });
    expect(debt.skippedRestDays).toEqual(['2026-01-05']);
    expect(await SalatLog.countDocuments({ userId: u })).toBe(0);

    jest.restoreAllMocks();
    expect(await debtService.restoreUncoveredDays(u, '2026-01-11')).toBe(1);
    debt = await SalatDebt.findOne({ userId: u });
    expect(debt.skippedRestDays).toEqual([]);
    expect((await state(u)).owed).toBe(5);
  });
});
