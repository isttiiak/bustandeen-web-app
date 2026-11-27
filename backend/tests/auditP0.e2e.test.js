import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import User from '../src/models/User.js';
import ZikrDaily from '../src/models/ZikrDaily.js';
import SalatDebt from '../src/models/SalatDebt.js';
import SalatLog from '../src/models/SalatLog.js';
import { validate } from '../src/middleware/validate.js';
import { devAuthBypassAllowed } from '../src/middleware/auth.js';
import { naseehPatternSchema } from '../src/validation/naseeh.schemas.js';
import { isPlausibleClientToday, latestPossibleToday } from '../src/validation/clientDay.js';
import { sameSitePath } from '../src/routes/seoRedirect.routes.js';
import { ensureCaughtUp } from '../src/services/salatDebt.service.js';

// Audit 2026-11-16, Phase 0. One test per fix.

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};
const token = fakeJwt({ uid: 'p0-1', email: 'p0@test.dev', name: 'P0' });
const as = (r) => r.set('Authorization', `Bearer ${token}`);

const DAY_MS = 86_400_000;
const utcDay = (offsetDays = 0) =>
  new Date(Date.now() + offsetDays * DAY_MS).toISOString().slice(0, 10);
const TODAY = utcDay();

let mongo;

beforeAll(async () => {
  process.env.DEV_AUTH_BYPASS = '1';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_audit_p0' });
  await request(app).post('/api/auth/verify').send({ idToken: token });
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect().catch(() => {});
  }
  if (mongo) await mongo.stop();
});

describe('P0-1 / P0-2: validate() hands parsed query values to the controller', () => {
  const mini = express();
  mini.get('/q', validate(naseehPatternSchema), (req, res) => {
    res.json({ phrase: req.query.phrase, timezoneOffset: req.query.timezoneOffset });
  });

  test('"phrase=0" is false, not the truthy string "0"', async () => {
    const res = await request(mini).get('/q?phrase=0&timezoneOffset=360');
    expect(res.body).toEqual({ phrase: false, timezoneOffset: 360 });
  });

  test('"phrase=1" is true, a missing phrase is false, a missing offset is the default', async () => {
    expect((await request(mini).get('/q?phrase=1')).body).toEqual({
      phrase: true,
      timezoneOffset: 0,
    });
    expect((await request(mini).get('/q')).body.phrase).toBe(false);
  });

  test('a query key the schema does not name still reaches the controller', async () => {
    const echo = express();
    echo.get('/q', validate(naseehPatternSchema), (req, res) => res.json(req.query));
    expect((await request(echo).get('/q?extra=kept')).body.extra).toBe('kept');
  });
});

describe('P0-3 / P0-4: the client "today" must be possible right now', () => {
  test('the allowed window is 2 days back to 1 day ahead of the UTC date', () => {
    expect(isPlausibleClientToday(utcDay(-2))).toBe(true);
    expect(isPlausibleClientToday(utcDay(0))).toBe(true);
    expect(isPlausibleClientToday(utcDay(1))).toBe(true);
    expect(isPlausibleClientToday(utcDay(-3))).toBe(false);
    expect(isPlausibleClientToday(utcDay(2))).toBe(false);
    expect(isPlausibleClientToday('2099-01-01')).toBe(false);
    expect(isPlausibleClientToday('not-a-date')).toBe(false);
  });

  test('a far-future today is refused before the missed-prayer sweep runs', async () => {
    const res = await as(request(app).get('/api/salat?today=2099-01-01'));
    expect(res.status).toBe(400);
    expect(await SalatLog.countDocuments({ userId: 'p0-1', date: { $gt: utcDay(2) } })).toBe(0);
    const debt = await SalatDebt.findOne({ userId: 'p0-1' }).lean();
    expect(!debt?.lastAccrualDate || debt.lastAccrualDate <= latestPossibleToday()).toBe(true);
  });

  // CodeQL triage 2026-11-27: /journey read `today` straight from the query string.
  test('the salat journey refuses an impossible or malformed today', async () => {
    for (const bad of ['2099-01-01', '0000-00-00', 'not-a-date'])
      expect((await as(request(app).get(`/api/salat/journey?today=${bad}`))).status).toBe(400);
    expect((await as(request(app).get('/api/salat/journey?today=a&today=b'))).status).toBe(400);
    expect((await as(request(app).get(`/api/salat/journey?today=${TODAY}`))).status).not.toBe(400);
  });

  test('a real today still works', async () => {
    expect((await as(request(app).get(`/api/salat?today=${TODAY}`))).status).toBe(200);
    expect((await as(request(app).get(`/api/salat/debt?today=${utcDay(-1)}`))).status).toBe(200);
  });

  test('the sweep itself never claims a cursor in the future', async () => {
    await ensureCaughtUp('p0-sweep', utcDay(-1));
    await ensureCaughtUp('p0-sweep', '2099-01-01');
    const debt = await SalatDebt.findOne({ userId: 'p0-sweep' }).lean();
    expect(debt.lastAccrualDate <= latestPossibleToday()).toBe(true);
    expect(await SalatLog.countDocuments({ userId: 'p0-sweep', date: { $gt: utcDay(2) } })).toBe(0);
  });

  test('"correct a day" cannot move its 30-day window with a forged today', async () => {
    const res = await as(request(app).put('/api/zikr/day')).send({
      date: '2020-01-01',
      today: '2020-01-02',
      counts: { SubhanAllah: 1_000_000 },
    });
    expect(res.status).toBe(400);
    expect(await ZikrDaily.countDocuments({ userId: 'p0-1' })).toBe(0);
  });
});

describe('P0-3: a zikr batch queued offline keeps its old "today"', () => {
  test('an old today is accepted, a future one is not', async () => {
    const send = (today) =>
      as(request(app).post('/api/zikr/increment')).send({
        zikrType: 'Alhamdulillah',
        amount: 1,
        timezoneOffset: 0,
        today,
      });
    expect((await send(utcDay(-4))).status).toBe(200);
    expect((await send('2099-01-01')).status).toBe(400);
  });
});

describe('P0-6: a failed day-bucket write does not move the lifetime totals', () => {
  test('the request fails and totalCount is unchanged', async () => {
    const before = (await User.findOne({ uid: 'p0-1' }).lean()).totalCount ?? 0;
    const spy = jest.spyOn(ZikrDaily, 'updateOne').mockRejectedValue(new Error('disk on fire'));
    const quiet = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const res = await as(request(app).post('/api/zikr/increment')).send({
        zikrType: 'SubhanAllah',
        amount: 33,
        timezoneOffset: 0,
      });
      expect(res.status).toBe(500);
    } finally {
      spy.mockRestore();
      quiet.mockRestore();
    }
    const after = (await User.findOne({ uid: 'p0-1' }).lean()).totalCount ?? 0;
    expect(after).toBe(before);
  });

  test('a normal increment still counts once in the bucket and the totals', async () => {
    const before = (await User.findOne({ uid: 'p0-1' }).lean()).totalCount ?? 0;
    const res = await as(request(app).post('/api/zikr/increment')).send({
      zikrType: 'SubhanAllah',
      amount: 33,
      timezoneOffset: 0,
    });
    expect(res.status).toBe(200);
    expect(res.body.totalCount).toBe(before + 33);
    const buckets = await ZikrDaily.find({ userId: 'p0-1', zikrType: 'SubhanAllah' }).lean();
    expect(buckets.reduce((n, b) => n + b.count, 0)).toBe(33);
  });
});

describe('P0-7: SEO redirects stay on this site', () => {
  test('a second leading slash is collapsed', async () => {
    const res = await request(app).get('/ar//evil.com');
    expect(res.status).toBe(301);
    expect(res.headers.location).toBe('/evil.com');
  });

  test('backslashes and slash runs cannot name another host', () => {
    expect(sameSitePath('//evil.com')).toBe('/evil.com');
    expect(sameSitePath('/\\evil.com')).toBe('/evil.com');
    expect(sameSitePath('\\\\evil.com/x')).toBe('/evil.com/x');
    expect(sameSitePath('/duas/travel')).toBe('/duas/travel');
    expect(sameSitePath('/')).toBe('/');
  });
});

describe('P0-8: the dev auth bypass is off on any Vercel deployment', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env.NODE_ENV = saved.NODE_ENV;
    process.env.DEV_AUTH_BYPASS = saved.DEV_AUTH_BYPASS;
    if (saved.VERCEL === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = saved.VERCEL;
  });

  test('VERCEL set, or production, turns it off', () => {
    process.env.DEV_AUTH_BYPASS = '1';
    process.env.NODE_ENV = 'test';
    delete process.env.VERCEL;
    expect(devAuthBypassAllowed()).toBe(true);
    process.env.VERCEL = '1';
    expect(devAuthBypassAllowed()).toBe(false);
    delete process.env.VERCEL;
    process.env.NODE_ENV = 'production';
    expect(devAuthBypassAllowed()).toBe(false);
  });
});
