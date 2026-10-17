import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import AdminAccount from '../src/models/AdminAccount.js';
import CronRun from '../src/models/CronRun.js';
import MoonSighting from '../src/models/MoonSighting.js';
import { MOON_REBUILD_MIN_GAP_MS } from '../src/services/cron.service.js';

// R11a: saving or withdrawing a moon-sighting record asks Vercel to rebuild
// the prerendered pages (the Ramadan calendars read the records at build
// time), rate-limited and recorded in CronRun as 'moon-rebuild'. The record is
// saved whatever the hook does.

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

const HOOK = 'https://api.vercel.com/v1/integrations/deploy/prj_moon/hook';
const SERVANT = 'servant@moon-rebuild.dev';
const asServant = (r) => r.set('x-admin-token', fakeJwt({ uid: 'servant-uid', email: SERVANT }));

const RAMADAN = {
  country: 'BD',
  hijriYear: 1448,
  hijriMonth: 9,
  startDate: '2027-02-09',
  note: 'National Moon Sighting Committee announcement.',
};
const SHAWWAL = { ...RAMADAN, hijriMonth: 10, startDate: '2027-03-10' };

let mongo;

describe('moon record -> rebuild (R11a)', () => {
  const env = { ...process.env };
  let fetchSpy;

  beforeAll(async () => {
    process.env.DEV_AUTH_BYPASS = '1';
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_moon_rebuild' });
    await AdminAccount.create({
      firebaseUid: 'servant-uid',
      email: SERVANT,
      role: 'servant',
      createdBy: 'test-seed',
    });
  });

  beforeEach(async () => {
    process.env.DEV_AUTH_BYPASS = '1';
    process.env.VERCEL_DEPLOY_HOOK_URL = HOOK;
    fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    await CronRun.deleteMany({});
    await MoonSighting.deleteMany({});
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    process.env = { ...env };
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect().catch(() => {});
    if (mongo) await mongo.stop();
  });

  const create = (body) => asServant(request(app).post('/api/admin/moon-sighting')).send(body);

  test('a new record POSTs the deploy hook and records the run', async () => {
    const res = await create(RAMADAN);
    expect(res.status).toBe(201);
    expect(res.body.rebuild).toMatchObject({ ok: true, requested: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe(HOOK);
    expect(fetchSpy.mock.calls[0][1].method).toBe('POST');
    const run = await CronRun.findById('moon-rebuild').lean();
    expect(run.ok).toBe(true);
    // The hook URL is a secret: never stored or returned.
    expect(JSON.stringify(run)).not.toContain('prj_moon');
    expect(JSON.stringify(res.body)).not.toContain('prj_moon');
  });

  test('a second change inside the gap rides on the rebuild already requested', async () => {
    await create(RAMADAN);
    const second = await create(SHAWWAL);
    expect(second.status).toBe(201);
    expect(second.body.rebuild).toMatchObject({ ok: true, requested: false });
    expect(second.body.rebuild.detail).toMatch(/includes this change/);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test('withdrawing a record after the gap rebuilds again', async () => {
    const made = await create(RAMADAN);
    await CronRun.updateOne(
      { _id: 'moon-rebuild' },
      { $set: { ranAt: new Date(Date.now() - MOON_REBUILD_MIN_GAP_MS - 1000) } }
    );
    const res = await asServant(
      request(app).patch(`/api/admin/moon-sighting/${made.body.record._id}/deactivate`)
    );
    expect(res.status).toBe(200);
    expect(res.body.record.active).toBe(false);
    expect(res.body.rebuild).toMatchObject({ ok: true, requested: true });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  test('a failed hook still saves the record, says so, and is retried next time', async () => {
    fetchSpy.mockResolvedValue(new Response('no', { status: 500 }));
    const res = await create(RAMADAN);
    expect(res.status).toBe(201);
    expect(await MoonSighting.countDocuments({ active: true })).toBe(1);
    expect(res.body.rebuild).toMatchObject({ ok: false, requested: false });
    expect(res.body.rebuild.detail).toContain('500');
    // A failure does not hold back the next request.
    fetchSpy.mockResolvedValue(new Response('{}'));
    const again = await create(SHAWWAL);
    expect(again.body.rebuild).toMatchObject({ ok: true, requested: true });
  });

  test('without the hook URL nothing is called and the record is saved', async () => {
    delete process.env.VERCEL_DEPLOY_HOOK_URL;
    const res = await create(RAMADAN);
    expect(res.status).toBe(201);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(res.body.rebuild).toMatchObject({ ok: false, requested: false });
  });
});
