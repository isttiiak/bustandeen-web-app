import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import User from '../src/models/User.js';
import SalatLog from '../src/models/SalatLog.js';
import SalatDebt from '../src/models/SalatDebt.js';
import SalatDebtEvent from '../src/models/SalatDebtEvent.js';
import KazaUnit from '../src/models/KazaUnit.js';
import FastingLog from '../src/models/FastingLog.js';
import ZikrDaily from '../src/models/ZikrDaily.js';
import { latestPossibleToday } from '../src/validation/clientDay.js';

// Audit 2026-11-16 P1-7: the backup import trusted a file's dates and its
// Kaza ledger, and replaced the ledger without a transaction.

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

let mongo;
beforeAll(async () => {
  process.env.DEV_AUTH_BYPASS = '1';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_backup_hostile' });
  await Promise.all([KazaUnit.init(), SalatLog.init(), SalatDebt.init(), SalatDebtEvent.init()]);
});
afterAll(async () => {
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect().catch(() => {});
  if (mongo) await mongo.stop();
});
afterEach(() => jest.restoreAllMocks());

let n = 0;
async function newUser() {
  const uid = `bk${++n}`;
  await User.create({ uid, email: `${uid}@test.dev` });
  const token = fakeJwt({ uid, email: `${uid}@test.dev` });
  return { uid, as: (r) => r.set('Authorization', `Bearer ${token}`) };
}
const file = (extra) => ({ app: 'ihsan', version: 3, ...extra });
const send = (u, body) => u.as(request(app).post('/api/user/import')).send(body);
const log = (date) => ({ date, prayers: { fajr: { status: 'completed' } } });

describe('import: dates must be real calendar days', () => {
  test('rows with malformed or impossible dates are skipped, valid ones kept', async () => {
    const u = await newUser();
    const res = await send(
      u,
      file({
        salat: {
          logs: [
            log('2026-03-01'),
            log('2026-02-30'),
            log('2026-13-01'),
            log('not-a-date'),
            log('2026-3-1'),
            log(`2026-03-02${'x'.repeat(2000)}`),
          ],
        },
        fasting: {
          logs: [
            { date: '2026-03-01', category: 'ramadan', status: 'completed' },
            { date: '2026-02-31', category: 'ramadan', status: 'completed' },
          ],
        },
      })
    );
    expect(res.status).toBe(200);
    expect((await SalatLog.find({ userId: u.uid })).map((l) => l.date)).toEqual(['2026-03-01']);
    expect((await FastingLog.find({ userId: u.uid })).map((l) => l.date)).toEqual(['2026-03-01']);
    expect(res.body.counts.salatDays).toBe(1);
    expect(res.body.counts.skippedRows).toBe(6); // 5 salat days and 1 fasting day left out
  });
});

describe('import: the Kaza ledger is checked before it replaces anything', () => {
  test('owed counts are bounded whole numbers, and bad dates are dropped', async () => {
    const u = await newUser();
    const res = await send(
      u,
      file({
        salat: {
          kaza: {
            debt: {
              owed: { fajr: 5, dhuhr: -3, asr: 1.5, maghrib: 99_999_999_999, isha: 12 },
              since: '2026-01-01',
              lastAccrualDate: '2026-03-01',
              skippedRestDays: ['2026-02-02', '2026-02-30', 'junk', 7],
            },
          },
        },
      })
    );
    expect(res.status).toBe(200);
    const debt = await SalatDebt.findOne({ userId: u.uid });
    expect(debt.owed.fajr).toBe(5);
    expect(debt.owed.dhuhr).toBe(0);
    expect(debt.owed.asr).toBe(0);
    expect(debt.owed.maghrib).toBeLessThanOrEqual(1_000_000);
    expect(debt.owed.isha).toBe(12);
    expect(debt.skippedRestDays).toEqual(['2026-02-02']);
  });

  test('a cursor in the future is pulled back so the sweep keeps running (as in P0-3)', async () => {
    const u = await newUser();
    await send(
      u,
      file({
        salat: { kaza: { debt: { owed: {}, since: '2026-01-01', lastAccrualDate: '9999-12-31' } } },
      })
    );
    const debt = await SalatDebt.findOne({ userId: u.uid });
    const newest = new Date(`${latestPossibleToday()}T00:00:00Z`);
    newest.setUTCDate(newest.getUTCDate() - 1);
    expect(debt.lastAccrualDate <= newest.toISOString().substring(0, 10)).toBe(true);
  });

  test('a cursor from the distant past cannot make the sweep walk centuries', async () => {
    const u = await newUser();
    await send(
      u,
      file({
        salat: { kaza: { debt: { owed: {}, since: '0001-01-01', lastAccrualDate: '0001-01-01' } } },
      })
    );
    const debt = await SalatDebt.findOne({ userId: u.uid });
    expect(debt.since >= '2000-01-01').toBe(true);
    expect(debt.lastAccrualDate >= '2000-01-01').toBe(true);
  });

  test('units and events with bad dates or unknown prayers are dropped; duplicates collapse', async () => {
    const u = await newUser();
    const res = await send(
      u,
      file({
        salat: {
          kaza: {
            debt: { owed: { fajr: 3 }, since: '2026-01-01', lastAccrualDate: '2026-03-01' },
            units: [
              { prayer: 'fajr', missedDate: '2026-02-01', status: 'owed' },
              { prayer: 'fajr', missedDate: '2026-02-01', status: 'owed' },
              { prayer: 'fajr', missedDate: '2026-02-30', status: 'owed' },
              { prayer: 'witr', missedDate: '2026-02-02', status: 'owed' },
              { prayer: 'asr', missedDate: '2026-02-03', status: 'owed' },
            ],
            events: [
              { prayer: 'fajr', delta: 1, date: '2026-02-01' },
              { prayer: 'fajr', delta: 1, date: 'bad' },
            ],
          },
        },
      })
    );
    expect(res.status).toBe(200);
    const units = await KazaUnit.find({ userId: u.uid }).sort({ missedDate: 1 });
    expect(units.map((x) => `${x.prayer}:${x.missedDate}`)).toEqual([
      'fajr:2026-02-01',
      'asr:2026-02-03',
    ]);
    expect(await SalatDebtEvent.countDocuments({ userId: u.uid })).toBe(1);
  });
});

describe('import: all or nothing', () => {
  async function seedLedger(u) {
    await SalatDebt.create({
      userId: u.uid,
      owed: { fajr: 7 },
      since: '2026-01-01',
      lastAccrualDate: '2026-03-01',
    });
    await KazaUnit.create({
      userId: u.uid,
      prayer: 'fajr',
      missedDate: '2026-01-05',
      status: 'owed',
    });
    await SalatDebtEvent.create({ userId: u.uid, prayer: 'fajr', delta: 1, date: '2026-01-05' });
  }
  const incoming = file({
    salat: {
      logs: [log('2026-03-01')],
      kaza: {
        debt: { owed: { fajr: 1 }, since: '2026-02-01', lastAccrualDate: '2026-03-01' },
        units: [{ prayer: 'isha', missedDate: '2026-02-10', status: 'owed' }],
        events: [{ prayer: 'isha', delta: 1, date: '2026-02-10' }],
      },
    },
  });

  test('a failure part-way leaves the existing ledger, and everything else, as it was', async () => {
    const u = await newUser();
    await seedLedger(u);
    jest.spyOn(KazaUnit, 'insertMany').mockRejectedValueOnce(new Error('disk full'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await send(u, incoming);
    expect(res.status).toBe(500);
    expect((await SalatDebt.findOne({ userId: u.uid })).owed.fajr).toBe(7);
    expect(await KazaUnit.countDocuments({ userId: u.uid })).toBe(1);
    expect((await KazaUnit.findOne({ userId: u.uid })).missedDate).toBe('2026-01-05');
    expect(await SalatDebtEvent.countDocuments({ userId: u.uid })).toBe(1);
    expect(await SalatLog.countDocuments({ userId: u.uid })).toBe(0); // the day rows rolled back too
  });

  test('a good file still replaces the ledger and adds the days', async () => {
    const u = await newUser();
    await seedLedger(u);
    const res = await send(u, incoming);
    expect(res.status).toBe(200);
    expect((await SalatDebt.findOne({ userId: u.uid })).owed.fajr).toBe(1);
    expect((await KazaUnit.find({ userId: u.uid })).map((x) => x.prayer)).toEqual(['isha']);
    expect(await SalatLog.countDocuments({ userId: u.uid })).toBe(1);
  });
});

describe('import: zikr totals', () => {
  test('a total that is not a sensible whole number is ignored', async () => {
    const u = await newUser();
    // 1e999 is valid JSON and parses to Infinity.
    const body = `{"app":"ihsan","version":3,"zikr":{"totalCount":1e999,"zikrTotals":{"SubhanAllah":12,"Bad":1e999,"Frac":1.5,"Neg":-4},"daily":[]}}`;
    const res = await u
      .as(request(app).post('/api/user/import'))
      .set('Content-Type', 'application/json')
      .send(body);
    expect(res.status).toBe(200);
    const user = await User.findOne({ uid: u.uid });
    expect(Number.isFinite(user.totalCount ?? 0)).toBe(true);
    const totals = Object.fromEntries(user.zikrTotals ?? []);
    expect(totals).toEqual({ SubhanAllah: 12 });
  });

  test('a zikr day with an impossible date is skipped', async () => {
    const u = await newUser();
    await send(
      u,
      file({
        zikr: {
          daily: [
            { date: '2026-03-01T00:00:00.000Z', zikrType: 'SubhanAllah', count: 3 },
            { date: 'garbage', zikrType: 'SubhanAllah', count: 9 },
          ],
        },
      })
    );
    expect(await ZikrDaily.countDocuments({ userId: u.uid })).toBe(1);
  });
});
