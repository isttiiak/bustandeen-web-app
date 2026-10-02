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

describe('Social API (share activities)', () => {
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

  const tokenA = fakeJwt({ uid: 'amir', email: 'amir@test.dev', name: 'Amir' });
  const tokenB = fakeJwt({ uid: 'bilal', email: 'bilal@test.dev', name: 'Bilal' });
  const asA = (r) => r.set('Authorization', `Bearer ${tokenA}`);
  const asB = (r) => r.set('Authorization', `Bearer ${tokenB}`);

  let codeA;

  // The server now honors the client-sent tracking day exactly, so the test's
  // "today" must match where clock-based zikr buckets actually land (UTC+6).
  const TODAY = new Date(Date.now() + 360 * 60 * 1000).toISOString().slice(0, 10);

  test('summary requires auth', async () => {
    const res = await request(app).get(`/api/social/summary`);
    expect(res.status).toBe(401);
  });

  test('summary creates a profile with an invite code; leaderboard contains me', async () => {
    await request(app).post(`/api/auth/verify`).send({ idToken: tokenA });
    await request(app).post(`/api/auth/verify`).send({ idToken: tokenB });

    const res = await asA(
      request(app).get(`/api/social/summary?today=${TODAY}&timezoneOffset=360`)
    );
    expect(res.status).toBe(200);
    expect(res.body.inviteCode).toMatch(/^[A-Za-z0-9_-]{6,}$/);
    expect(res.body.leaderboard).toHaveLength(1);
    expect(res.body.leaderboard[0].isMe).toBe(true);
    codeA = res.body.inviteCode;
  });

  test('cannot connect with your own code', async () => {
    const res = await asA(request(app).post(`/api/social/connect`)).send({ code: codeA });
    expect(res.status).toBe(400);
  });

  test('invalid code is rejected politely', async () => {
    const res = await asB(request(app).post(`/api/social/connect`)).send({ code: 'nope-nope' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  test('connecting via invite code sends a pending request, not an instant friendship', async () => {
    const res = await asB(request(app).post(`/api/social/connect`)).send({ code: codeA });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.pending).toBe(true);
    expect(res.body.friendUid).toBe('amir');

    // Not friends yet — neither leaderboard shows the other person
    const sumA = await asA(
      request(app).get(`/api/social/summary?today=${TODAY}&timezoneOffset=360`)
    );
    const sumB = await asB(
      request(app).get(`/api/social/summary?today=${TODAY}&timezoneOffset=360`)
    );
    expect(sumA.body.leaderboard).toHaveLength(1);
    expect(sumB.body.leaderboard).toHaveLength(1);

    // Re-sending the same request is idempotent, not a duplicate
    const again = await asB(request(app).post(`/api/social/connect`)).send({ code: codeA });
    expect(again.status).toBe(200);
    expect(again.body.message).toMatch(/already sent/i);
  });

  test("amir sees bilal's request and can reject it, then bilal can re-request", async () => {
    const incoming = await asA(request(app).get(`/api/social/requests`));
    expect(incoming.status).toBe(200);
    expect(incoming.body.requests).toHaveLength(1);
    expect(incoming.body.requests[0].uid).toBe('bilal');

    const rejected = await asA(request(app).post(`/api/social/requests/bilal/reject`));
    expect(rejected.status).toBe(200);
    expect(rejected.body.ok).toBe(true);

    // Request is gone from both sides
    const afterReject = await asA(request(app).get(`/api/social/requests`));
    expect(afterReject.body.requests).toHaveLength(0);

    // Bilal can send a fresh request since the old one was cleared
    const retry = await asB(request(app).post(`/api/social/connect`)).send({ code: codeA });
    expect(retry.body.pending).toBe(true);
  });

  test('accepting the request makes both sides mutual friends', async () => {
    const res = await asA(request(app).post(`/api/social/requests/bilal/accept`));
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.friendUid).toBe('bilal');

    // No longer pending
    const incoming = await asA(request(app).get(`/api/social/requests`));
    expect(incoming.body.requests).toHaveLength(0);

    // Both sides see each other
    const sumA = await asA(
      request(app).get(`/api/social/summary?today=${TODAY}&timezoneOffset=360`)
    );
    const sumB = await asB(
      request(app).get(`/api/social/summary?today=${TODAY}&timezoneOffset=360`)
    );
    expect(sumA.body.leaderboard.map((f) => f.uid).sort()).toEqual(['amir', 'bilal']);
    expect(sumB.body.leaderboard.map((f) => f.uid).sort()).toEqual(['amir', 'bilal']);
  });

  test('invisible friend is hidden from the leaderboard entirely, even for existing friends', async () => {
    const set = await asB(request(app).patch(`/api/social/invisible`)).send({ invisible: true });
    expect(set.status).toBe(200);
    expect(set.body.invisible).toBe(true);

    const sumA = await asA(
      request(app).get(`/api/social/summary?today=${TODAY}&timezoneOffset=360`)
    );
    expect(sumA.body.leaderboard.map((f) => f.uid)).toEqual(['amir']); // bilal hidden

    // Invisible only hides YOU from OTHERS — Bilal still sees Amir (and
    // himself) on his own dashboard, since Amir hasn't gone invisible
    const sumB = await asB(
      request(app).get(`/api/social/summary?today=${TODAY}&timezoneOffset=360`)
    );
    expect(sumB.body.leaderboard.map((f) => f.uid).sort()).toEqual(['amir', 'bilal']);

    // Turn it back off for the rest of the suite
    await asB(request(app).patch(`/api/social/invisible`)).send({ invisible: false });
  });

  test('leaderboard ranks by activity score', async () => {
    // Bilal does zikr (meets default goal 100) → his score should rise above Amir's
    await asB(request(app).post(`/api/zikr/increment/batch`)).send({
      increments: [{ zikrType: 'SubhanAllah', amount: 120 }],
      timezoneOffset: 360,
    });
    // Bilal also prays two fard prayers today
    await asB(request(app).patch(`/api/salat/prayer`)).send({
      prayer: 'fajr',
      status: 'completed',
      date: TODAY,
    });
    await asB(request(app).patch(`/api/salat/prayer`)).send({
      prayer: 'dhuhr',
      status: 'kaza',
      date: TODAY,
    });

    const res = await asA(
      request(app).get(`/api/social/summary?today=${TODAY}&timezoneOffset=360`)
    );
    const [first, second] = res.body.leaderboard;
    expect(first.uid).toBe('bilal');
    expect(first.salatToday).toBe(2);
    expect(first.score).toBeGreaterThan(second.score);
    // Score is prayer-time-aware: salat pts = round(done/due * 50) so exact
    // value varies by time of day — just verify it's in the valid 0–100 range
    expect(first.score).toBeGreaterThanOrEqual(0);
    expect(first.score).toBeLessThanOrEqual(100);
  });

  test("noor endpoint returns today's and all-time Noor", async () => {
    const res = await asB(request(app).get(`/api/social/noor?today=${TODAY}&timezoneOffset=360`));
    expect(res.status).toBe(200);
    // Today's Noor is prayer-time-aware so exact value varies by time of day
    expect(res.body.today).toBeGreaterThanOrEqual(0);
    expect(res.body.today).toBeLessThanOrEqual(100);
    expect(typeof res.body.allTime).toBe('number');
  });

  test('friends see a preset avatar id, never a data: photo', async () => {
    await asB(request(app).patch('/api/user/me')).send({ avatarId: 'olive' });
    const res = await asA(request(app).get(`/api/social/friends`));
    expect(res.body.friends[0].avatarId).toBe('olive');
    expect(res.body.friends[0].photoUrl).toBeUndefined();
    await asB(request(app).patch('/api/user/me')).send({ avatarId: null });
    const after = await asA(request(app).get(`/api/social/friends`));
    expect(after.body.friends[0].avatarId).toBeUndefined();
  });

  test('friends list returns the connection with a connectedSince date', async () => {
    const res = await asA(request(app).get(`/api/social/friends`));
    expect(res.status).toBe(200);
    expect(res.body.friends).toHaveLength(1);
    expect(res.body.friends[0].uid).toBe('bilal');
    expect(res.body.friends[0].displayName).toBe('Bilal');
    expect(res.body.friends[0].connectedSince).not.toBeNull();
    expect(new Date(res.body.friends[0].connectedSince).getTime()).not.toBeNaN();

    // Symmetric on Bilal's side too
    const resB = await asB(request(app).get(`/api/social/friends`));
    expect(resB.body.friends).toHaveLength(1);
    expect(resB.body.friends[0].uid).toBe('amir');
  });

  test('unfriend removes the connection on both sides', async () => {
    const res = await asA(request(app).delete(`/api/social/friends/bilal`));
    expect(res.status).toBe(200);

    const sumA = await asA(
      request(app).get(`/api/social/summary?today=${TODAY}&timezoneOffset=360`)
    );
    const sumB = await asB(
      request(app).get(`/api/social/summary?today=${TODAY}&timezoneOffset=360`)
    );
    expect(sumA.body.leaderboard).toHaveLength(1);
    expect(sumB.body.leaderboard).toHaveLength(1);

    // Friends list is now empty on both sides
    const listA = await asA(request(app).get(`/api/social/friends`));
    const listB = await asB(request(app).get(`/api/social/friends`));
    expect(listA.body.friends).toHaveLength(0);
    expect(listB.body.friends).toHaveLength(0);
  });

  test('blocking someone tears down the relationship and hides you from their invite link', async () => {
    // Bilal re-sends a request to re-establish something to tear down
    await asB(request(app).post(`/api/social/connect`)).send({ code: codeA });
    const pendingBefore = await asA(request(app).get(`/api/social/requests`));
    expect(pendingBefore.body.requests).toHaveLength(1);

    const block = await asA(request(app).post(`/api/social/block/bilal`));
    expect(block.status).toBe(200);
    expect(block.body.ok).toBe(true);

    // The pending request is gone, and it shows up in Amir's blocked list
    const pendingAfter = await asA(request(app).get(`/api/social/requests`));
    expect(pendingAfter.body.requests).toHaveLength(0);
    const blockedList = await asA(request(app).get(`/api/social/blocked`));
    expect(blockedList.body.blocked.map((b) => b.uid)).toEqual(['bilal']);

    // Bilal trying the same invite code again gets the SAME generic message
    // as an invalid code — never told he was specifically blocked
    const retry = await asB(request(app).post(`/api/social/connect`)).send({ code: codeA });
    expect(retry.status).toBe(400);
    expect(retry.body.message).toMatch(/not valid/i);

    // Unblocking restores the ability to connect
    const unblock = await asA(request(app).delete(`/api/social/block/bilal`));
    expect(unblock.status).toBe(200);
    const afterUnblock = await asB(request(app).post(`/api/social/connect`)).send({ code: codeA });
    expect(afterUnblock.body.pending).toBe(true);
  });
});
