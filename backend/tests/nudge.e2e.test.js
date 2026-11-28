import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Nudge from '../src/models/Nudge.js';

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

let mongo;

describe('Friend nudges', () => {
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

  const tok = (uid) => fakeJwt({ uid, email: `${uid}@test.dev`, name: uid });
  const as = (uid, r) => r.set('Authorization', `Bearer ${tok(uid)}`);
  const TODAY = new Date(Date.now() + 360 * 60 * 1000).toISOString().slice(0, 10);
  const summary = (uid) =>
    as(uid, request(app).get(`/api/social/summary?today=${TODAY}&timezoneOffset=360`));
  const nudge = (from, to, body = {}) =>
    as(from, request(app).post(`/api/social/nudge/${to}`)).send({ today: TODAY, ...body });

  // sender is friends with `quiet` (no activity) and `busy` (has zikr today), a stranger is unrelated
  beforeAll(async () => {
    for (const uid of ['sender', 'quiet', 'busy', 'stranger']) {
      await request(app)
        .post('/api/auth/verify')
        .send({ idToken: tok(uid) });
    }
    for (const friend of ['quiet', 'busy']) {
      const code = (await summary(friend)).body.inviteCode;
      await as('sender', request(app).post('/api/social/connect')).send({ code });
      await as(friend, request(app).post('/api/social/requests/sender/accept'));
    }
    await as('busy', request(app).post('/api/zikr/increment/batch')).send({
      increments: [{ zikrType: 'SubhanAllah', amount: 20 }],
      timezoneOffset: 360,
    });
  });

  test('requires auth', async () => {
    expect((await request(app).post('/api/social/nudge/quiet').send({})).status).toBe(401);
    expect((await request(app).get('/api/social/nudges')).status).toBe(401);
  });

  test('only a quiet friend is marked nudgeable in the circle', async () => {
    const res = await summary('sender');
    const row = (uid) => res.body.circle.find((f) => f.uid === uid);
    expect(row('quiet').canNudge).toBe(true);
    expect(row('busy').canNudge).toBeUndefined();
    expect(row('sender').canNudge).toBeUndefined();
  });

  test('cannot nudge a stranger, yourself or a friend who has been active', async () => {
    for (const to of ['stranger', 'sender', 'busy']) {
      const res = await nudge('sender', to);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ ok: false, reason: 'unavailable' });
    }
    expect(await Nudge.countDocuments({})).toBe(0);
  });

  test('a message over 140 characters is rejected', async () => {
    const res = await nudge('sender', 'quiet', { message: 'x'.repeat(141) });
    expect(res.status).toBe(400);
  });

  test('a nudge reaches the friend with the sender, count and message', async () => {
    const res = await nudge('sender', 'quiet', { message: '  Come\nback   soon  ' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const mine = await as('quiet', request(app).get('/api/social/nudges'));
    expect(mine.body.nudges).toHaveLength(1);
    expect(mine.body.nudges[0]).toMatchObject({
      fromUid: 'sender',
      displayName: 'sender',
      count: 1,
      message: 'Come back soon',
    });
    // the sender's own list is empty, the busy friend got nothing
    expect((await as('sender', request(app).get('/api/social/nudges'))).body.nudges).toEqual([]);
    expect((await as('busy', request(app).get('/api/social/nudges'))).body.nudges).toEqual([]);
  });

  test('a second nudge the same day waits, and the circle says so', async () => {
    const again = await nudge('sender', 'quiet');
    expect(again.status).toBe(429);
    expect(again.body.reason).toBe('cooldown');
    const row = (await summary('sender')).body.circle.find((f) => f.uid === 'quiet');
    expect(row.nudged).toBe(true);
  });

  test('dismissing hides it; a nudge after the cooldown counts up and shows again', async () => {
    await as('quiet', request(app).post('/api/social/nudges/dismiss')).send({});
    expect((await as('quiet', request(app).get('/api/social/nudges'))).body.nudges).toEqual([]);

    // a day later
    await Nudge.updateOne(
      { fromUid: 'sender', toUid: 'quiet' },
      { $set: { lastNudgedAt: new Date(Date.now() - 25 * 60 * 60 * 1000) } }
    );
    const res = await nudge('sender', 'quiet');
    expect(res.status).toBe(200);
    const mine = await as('quiet', request(app).get('/api/social/nudges'));
    expect(mine.body.nudges[0]).toMatchObject({ count: 2, message: '' });
  });

  test('a friend who leaves the circle takes the nudges with them', async () => {
    await as('quiet', request(app).delete('/api/social/friends/sender'));
    expect(await Nudge.countDocuments({})).toBe(0);
    expect((await as('quiet', request(app).get('/api/social/nudges'))).body.nudges).toEqual([]);
  });
});
