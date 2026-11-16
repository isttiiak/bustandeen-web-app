import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { setClientDayBoundForTests } from '../src/validation/clientDay.js';
import SalatDebt from '../src/models/SalatDebt.js';
import SalatLog from '../src/models/SalatLog.js';
import KazaUnit from '../src/models/KazaUnit.js';

// Audit 2026-11-16 P1-1: a prayer status was read, changed and saved, and the
// kaza debt moved from what was read. Two requests at once (a double tap, two
// devices, an offline replay) both saw the old status and both moved the debt,
// and two requests creating the day's log at once ended in a duplicate-key 500.

setClientDayBoundForTests(false);

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

let mongo;
const day = '2026-03-10';

beforeAll(async () => {
  process.env.DEV_AUTH_BYPASS = '1';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_salat_race' });
  await Promise.all([SalatLog.init(), SalatDebt.init(), KazaUnit.init()]);
});
afterAll(async () => {
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect().catch(() => {});
  if (mongo) await mongo.stop();
});

const as = (uid) => {
  const token = fakeJwt({ uid, email: `${uid}@test.dev`, name: uid });
  return (r) => r.set('Authorization', `Bearer ${token}`);
};
const setStatus = (auth, status, prayer = 'fajr') =>
  auth(request(app).patch('/api/salat/prayer').send({ date: day, prayer, status }));
const owed = async (uid, prayer = 'fajr') =>
  (await SalatDebt.findOne({ userId: uid }))?.owed?.[prayer] ?? 0;

describe('prayer status: concurrent writes', () => {
  test('the same "missed" tap sent 8 times at once adds one unit of debt', async () => {
    const auth = as('race1');
    const res = await Promise.all(Array.from({ length: 8 }, () => setStatus(auth, 'missed')));
    expect(res.map((r) => r.status)).toEqual(Array(8).fill(200)); // no duplicate-key 500
    expect(await SalatLog.countDocuments({ userId: 'race1', date: day })).toBe(1);
    expect(await owed('race1')).toBe(1);
    expect(await KazaUnit.countDocuments({ userId: 'race1', status: 'owed' })).toBe(1);
  });

  test('on an existing log too', async () => {
    const auth = as('race2');
    await setStatus(auth, 'pending');
    const res = await Promise.all(Array.from({ length: 8 }, () => setStatus(auth, 'missed')));
    expect(res.map((r) => r.status)).toEqual(Array(8).fill(200));
    expect(await owed('race2')).toBe(1);
  });

  test('missed then done, racing: the debt matches the status that was stored', async () => {
    const auth = as('race3');
    await setStatus(auth, 'missed');
    const res = await Promise.all([
      ...Array.from({ length: 4 }, () => setStatus(auth, 'completed')),
      ...Array.from({ length: 4 }, () => setStatus(auth, 'missed')),
    ]);
    expect(res.map((r) => r.status)).toEqual(Array(8).fill(200));
    const log = await SalatLog.findOne({ userId: 'race3', date: day });
    // Whatever order won, owed is 1 only when the stored status is "missed".
    expect(await owed('race3')).toBe(log.prayers.fajr.status === 'missed' ? 1 : 0);
  });

  test('two different prayers on one new day both land and both count', async () => {
    const auth = as('race4');
    const res = await Promise.all([
      setStatus(auth, 'missed', 'fajr'),
      setStatus(auth, 'missed', 'dhuhr'),
      setStatus(auth, 'missed', 'asr'),
    ]);
    expect(res.map((r) => r.status)).toEqual([200, 200, 200]);
    const log = await SalatLog.findOne({ userId: 'race4', date: day });
    expect(['fajr', 'dhuhr', 'asr'].map((p) => log.prayers[p].status)).toEqual([
      'missed',
      'missed',
      'missed',
    ]);
    expect([
      await owed('race4', 'fajr'),
      await owed('race4', 'dhuhr'),
      await owed('race4', 'asr'),
    ]).toEqual([1, 1, 1]);
  });

  test('a failed debt update leaves the log unchanged (they land together)', async () => {
    const auth = as('race5');
    await setStatus(auth, 'pending');
    const spy = jest
      .spyOn(SalatDebt, 'findOneAndUpdate')
      .mockRejectedValueOnce(new Error('debt write failed'));
    const res = await setStatus(auth, 'missed');
    spy.mockRestore();
    expect(res.status).toBe(500);
    const log = await SalatLog.findOne({ userId: 'race5', date: day });
    expect(log.prayers.fajr.status).toBe('pending');
    expect(await owed('race5')).toBe(0);
  });
});
