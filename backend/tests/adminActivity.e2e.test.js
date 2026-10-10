import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import AdminAccount from '../src/models/AdminAccount.js';
import User from '../src/models/User.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (d) => new Date(Date.now() - d * DAY);

let mongo;

describe('Overview activity metrics (U8.8)', () => {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_admin_activity' });
    await AdminAccount.create([
      { firebaseUid: 'act-servant', email: 's@act.dev', role: 'servant', createdBy: 's' },
      {
        firebaseUid: 'act-ansar',
        email: 'a@act.dev',
        role: 'ansar',
        ansarDomain: 'general',
        createdBy: 's',
      },
    ]);
    // Raw inserts so createdAt is exactly what the test says.
    await User.collection.insertMany([
      // Signed up 3 days ago, opened the app an hour ago.
      { uid: 'u1', createdAt: daysAgo(3), lastActiveAt: daysAgo(1 / 24) },
      // Signed up 10 days ago, came back on day 8 (counts as came back).
      { uid: 'u2', createdAt: daysAgo(10), lastActiveAt: daysAgo(2) },
      // Signed up 20 days ago, last seen the next day (did not come back).
      { uid: 'u3', createdAt: daysAgo(20), lastActiveAt: daysAgo(19) },
      // Signed up 60 days ago, last seen 40 days ago.
      { uid: 'u4', createdAt: daysAgo(60), lastActiveAt: daysAgo(40) },
      // Disabled and staff accounts never count.
      { uid: 'u5', createdAt: daysAgo(2), lastActiveAt: daysAgo(0.1), disabled: true },
      { uid: 'act-servant', createdAt: daysAgo(2), lastActiveAt: daysAgo(0.1) },
    ]);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
    if (mongo) await mongo.stop();
  });

  test('the Servant sees active users, weekly sign-ups and who came back', async () => {
    const res = await request(app)
      .get('/api/admin/stats/overview')
      .set('X-Admin-Token', fakeJwt({ uid: 'act-servant' }));
    expect(res.status).toBe(200);
    const a = res.body.servant.activity;
    expect([a.today, a.week, a.month]).toEqual([1, 2, 3]);
    expect(a.signupsByWeek).toHaveLength(8);
    expect(a.signupsByWeek.slice(0, 3)).toEqual([1, 1, 1]);
    expect(a.signupsByWeek.reduce((x, y) => x + y, 0)).toBe(3);
    expect(a.cameBack).toEqual({ cohort: 2, returned: 1 });
  });

  test('an Ansar never gets the activity numbers', async () => {
    const res = await request(app)
      .get('/api/admin/stats/overview')
      .set('X-Admin-Token', fakeJwt({ uid: 'act-ansar' }));
    expect(res.status).toBe(200);
    expect(res.body.servant).toBeUndefined();
  });
});
