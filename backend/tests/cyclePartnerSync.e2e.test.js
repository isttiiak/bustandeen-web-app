import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

let mongo;

describe('Rayhanah Cycle — partner sync (opt-in, revocable, status-only)', () => {
  beforeAll(async () => {
    process.env.DEV_AUTH_BYPASS = '1';
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test' });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
    if (mongo) await mongo.stop();
  });

  const tokenHer = fakeJwt({ uid: 'sync-her', email: 'sync-her@test.dev', name: 'Sync Her' });
  const tokenHim = fakeJwt({ uid: 'sync-him', email: 'sync-him@test.dev', name: 'Sync Him' });
  const tokenStranger = fakeJwt({
    uid: 'sync-stranger',
    email: 'sync-stranger@test.dev',
    name: 'Stranger',
  });
  const asHer = (r) => r.set('Authorization', `Bearer ${tokenHer}`);
  const asHim = (r) => r.set('Authorization', `Bearer ${tokenHim}`);

  const TODAY = new Date(Date.now() + 360 * 60 * 1000).toISOString().slice(0, 10);

  beforeAll(async () => {
    // Register all three users and connect Her <-> Him as mutual friends
    // (the required prerequisite — partner sync reuses the friend graph).
    await request(app).post('/api/auth/verify').send({ idToken: tokenHer });
    await request(app).post('/api/auth/verify').send({ idToken: tokenHim });
    await request(app).post('/api/auth/verify').send({ idToken: tokenStranger });

    const herSummary = await asHer(request(app).get('/api/social/summary?timezoneOffset=360'));
    const code = herSummary.body.inviteCode;
    // Him opens Her's invite link -> pending request; Her accepts.
    await asHim(request(app).post('/api/social/connect')).send({ code });
    await asHer(request(app).post('/api/social/requests/sync-him/accept'));
  });

  test('cannot enable sync without choosing a friend', async () => {
    const res = await asHer(request(app).patch('/api/cycle/partner-sync')).send({
      enabled: true,
    });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  test('cannot share with someone who is not a friend', async () => {
    const res = await asHer(request(app).patch('/api/cycle/partner-sync')).send({
      enabled: true,
      partnerUid: 'sync-stranger',
    });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  test('cannot link yourself', async () => {
    const res = await asHer(request(app).patch('/api/cycle/partner-sync')).send({
      enabled: true,
      partnerUid: 'sync-her',
    });
    expect(res.status).toBe(400);
  });

  test('no cycle status leaks to a friend before sync is enabled', async () => {
    await asHer(request(app).post('/api/cycle/start')).send({ date: TODAY, type: 'hayd' });
    const summary = await asHim(request(app).get('/api/social/summary?timezoneOffset=360'));
    const herRow = summary.body.circle.find((r) => r.uid === 'sync-her');
    expect(herRow).toBeTruthy();
    expect(herRow.onCycle).toBeUndefined();
  });

  test('enabling sync with the real friend succeeds and is reflected in her own summary', async () => {
    const res = await asHer(request(app).patch('/api/cycle/partner-sync')).send({
      enabled: true,
      partnerUid: 'sync-him',
    });
    expect(res.status).toBe(200);
    expect(res.body.enabled).toBe(true);
    expect(res.body.partnerUid).toBe('sync-him');

    const summary = await asHer(request(app).get(`/api/cycle/summary?today=${TODAY}`));
    expect(summary.body.partnerSync).toEqual({ enabled: true, partnerUid: 'sync-him' });
  });

  test('the linked partner sees onCycle:true; nobody else does', async () => {
    const himView = await asHim(request(app).get('/api/social/summary?timezoneOffset=360'));
    const herRowForHim = himView.body.circle.find((r) => r.uid === 'sync-her');
    expect(herRowForHim.onCycle).toBe(true);

    // Her own row, viewed by herself, never carries the flag either.
    const herView = await asHer(request(app).get('/api/social/summary?timezoneOffset=360'));
    const herOwnRow = herView.body.circle.find((r) => r.uid === 'sync-her');
    expect(herOwnRow.onCycle).toBeUndefined();
  });

  test('ending the cycle (same day) still counts that day as excused, and never leaks raw data', async () => {
    // Starting AND ending on the same day is still a period day for that
    // day — fiqh-correct, not a bug: onCycle stays true through end-of-day.
    await asHer(request(app).post('/api/cycle/end')).send({ date: TODAY });
    const himView = await asHim(request(app).get('/api/social/summary?timezoneOffset=360'));
    const herRow = himView.body.circle.find((r) => r.uid === 'sync-her');
    expect(herRow.onCycle).toBe(true);
    // No dates, symptoms, or notes ever appear on the leaderboard row.
    expect(herRow.startDate).toBeUndefined();
    expect(herRow.symptoms).toBeUndefined();
  });

  test('revoking sync is always allowed and immediately stops sharing', async () => {
    const res = await asHer(request(app).patch('/api/cycle/partner-sync')).send({
      enabled: false,
    });
    expect(res.status).toBe(200);
    expect(res.body.enabled).toBe(false);
    expect(res.body.partnerUid).toBeNull();

    const himView = await asHim(request(app).get('/api/social/summary?timezoneOffset=360'));
    const herRow = himView.body.circle.find((r) => r.uid === 'sync-her');
    expect(herRow.onCycle).toBeUndefined();
  });
});
