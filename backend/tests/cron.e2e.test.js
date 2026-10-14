import { jest } from '@jest/globals';
import fs from 'node:fs';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import CronRun from '../src/models/CronRun.js';

// LT-1: the monthly rebuild runs from a Vercel Cron, not a GitHub schedule.
let mongo;
const SECRET = 'test-cron-secret-0123456789';
const HOOK = 'https://api.vercel.com/v1/integrations/deploy/prj_test/hook';

describe('Vercel Cron jobs', () => {
  const env = { ...process.env };
  let fetchSpy;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_cron' });
  });

  beforeEach(async () => {
    process.env.CRON_SECRET = SECRET;
    process.env.VERCEL_DEPLOY_HOOK_URL = HOOK;
    fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    await CronRun.deleteMany({});
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

  const call = (auth = `Bearer ${SECRET}`) => {
    const r = request(app).get('/api/cron/rebuild');
    return auth ? r.set('Authorization', auth) : r;
  };

  test('refuses without the cron secret, and fails closed when none is set', async () => {
    expect((await call(null)).status).toBe(401);
    expect((await call('Bearer wrong')).status).toBe(401);
    delete process.env.CRON_SECRET;
    expect((await call()).status).toBe(503);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('POSTs the deploy hook and records the run', async () => {
    const res = await call();
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe(HOOK);
    expect(fetchSpy.mock.calls[0][1].method).toBe('POST');

    const run = await CronRun.findById('rebuild').lean();
    expect(run.ok).toBe(true);
    expect(run.lastOkAt).toBeInstanceOf(Date);
    // The hook URL is a secret: never stored.
    expect(JSON.stringify(run)).not.toContain('prj_test');
  });

  test('a failed hook answers 502 and keeps the last success', async () => {
    await call();
    const firstOk = (await CronRun.findById('rebuild').lean()).lastOkAt;

    fetchSpy.mockResolvedValue(new Response('no', { status: 500 }));
    const res = await call();
    expect(res.status).toBe(502);
    const run = await CronRun.findById('rebuild').lean();
    expect(run.ok).toBe(false);
    expect(run.detail).toContain('500');
    expect(run.lastOkAt.getTime()).toBe(firstOk.getTime());
  });

  test('without the hook URL nothing is called and the run is marked failed', async () => {
    delete process.env.VERCEL_DEPLOY_HOOK_URL;
    const res = await call();
    expect(res.status).toBe(502);
    expect(fetchSpy).not.toHaveBeenCalled();
    const run = await CronRun.findById('rebuild').lean();
    expect(run).toMatchObject({ ok: false, lastOkAt: null });
  });

  test('vercel.json schedules the job monthly, and GitHub has no schedule left', () => {
    const vercel = JSON.parse(fs.readFileSync(new URL('../../vercel.json', import.meta.url)));
    expect(vercel.crons).toContainEqual({ path: '/api/cron/rebuild', schedule: '30 0 1 * *' });
    expect(vercel.crons).toContainEqual({ path: '/api/cron/email-check', schedule: '0 1 * * *' });
    const wf = fs.readFileSync(
      new URL('../../.github/workflows/scheduled-rebuild.yml', import.meta.url),
      'utf8'
    );
    expect(wf).not.toMatch(/^\s*schedule:/m);
    expect(wf).toMatch(/workflow_dispatch/);
  });
});
