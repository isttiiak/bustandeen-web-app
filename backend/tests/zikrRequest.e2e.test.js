import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

const ADMIN_EMAIL = 'zikr-admin@test.dev';
const adminToken = fakeJwt({ uid: 'zikr-admin-uid', email: ADMIN_EMAIL });
const userToken = fakeJwt({ uid: 'zikr-req-u1', email: 'u1@test.dev' });
const otherUserToken = fakeJwt({ uid: 'zikr-req-u2', email: 'u2@test.dev' });

let mongo;
let adminSessionToken;

const validRequestBody = (overrides = {}) => ({
  name: 'Rabbi zidni ilma',
  arabic: 'رَبِّ زِدْنِي عِلْمًا',
  meaning: 'My Lord, increase me in knowledge',
  source: 'Quran 20:114',
  sourceUrl: 'https://quran.com/20/114',
  ...overrides,
});

describe('Zikr request API', () => {
  beforeAll(async () => {
    process.env.ADMIN_EMAILS = ADMIN_EMAIL;
    process.env.ADMIN_PANEL_PASSWORD = 'zikr-test-password';
    process.env.ADMIN_SESSION_SECRET = 'zikr-test-session-secret';
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_zikr_requests' });

    await request(app).post('/api/auth/verify').send({ idToken: adminToken });
    await request(app).post('/api/auth/verify').send({ idToken: userToken });
    await request(app).post('/api/auth/verify').send({ idToken: otherUserToken });

    const sessionRes = await request(app)
      .post('/api/admin/auth/verify-password')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ password: 'zikr-test-password' });
    adminSessionToken = sessionRes.body.token;
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
    if (mongo) await mongo.stop();
  });

  test('submitting a request requires auth', async () => {
    const res = await request(app).post('/api/zikr/requests').send(validRequestBody());
    expect(res.status).toBe(401);
  });

  test('admin request routes reject a signed-in non-admin', async () => {
    const res = await request(app)
      .get('/api/admin/zikr-requests')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  test('admin request routes reject an admin who has not entered the panel password', async () => {
    const res = await request(app)
      .get('/api/admin/zikr-requests')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('admin_session_required');
  });

  test('wrong admin panel password is rejected', async () => {
    const res = await request(app)
      .post('/api/admin/auth/verify-password')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ password: 'not-the-password' });
    expect(res.status).toBe(401);
  });

  test('a signed-in non-admin cannot even attempt the admin panel password', async () => {
    const res = await request(app)
      .post('/api/admin/auth/verify-password')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ password: 'zikr-test-password' });
    expect(res.status).toBe(403);
  });

  let requestId;

  test('submitting a request stores it as pending', async () => {
    const res = await request(app)
      .post('/api/zikr/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send(validRequestBody());
    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('pending');
    expect(res.body.request.name).toBe('Rabbi zidni ilma');
    requestId = res.body.request._id;
  });

  test('the requester sees it in /requests/mine; another user does not', async () => {
    const mine = await request(app)
      .get('/api/zikr/requests/mine')
      .set('Authorization', `Bearer ${userToken}`);
    expect(mine.body.requests.some((r) => r._id === requestId)).toBe(true);

    const other = await request(app)
      .get('/api/zikr/requests/mine')
      .set('Authorization', `Bearer ${otherUserToken}`);
    expect(other.body.requests.some((r) => r._id === requestId)).toBe(false);
  });

  test('admin (with a verified session) sees it in the pending queue', async () => {
    const res = await request(app)
      .get('/api/admin/zikr-requests?status=pending')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Admin-Token', adminSessionToken);
    expect(res.status).toBe(200);
    expect(res.body.requests.some((r) => r._id === requestId)).toBe(true);
  });

  test('email draft is returned for the approve/reject textarea', async () => {
    const res = await request(app)
      .get(`/api/admin/zikr-requests/${requestId}/email-draft?type=approved`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Admin-Token', adminSessionToken);
    expect(res.status).toBe(200);
    expect(res.body.body).toContain('Rabbi zidni ilma');
  });

  test('approving creates a global library item and marks the request approved', async () => {
    const res = await request(app)
      .post(`/api/admin/zikr-requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Admin-Token', adminSessionToken)
      .send({
        name: 'Rabbi zidni ilma',
        arabic: 'رَبِّ زِدْنِي عِلْمًا',
        meaning: 'My Lord, increase me in knowledge',
        source: 'Quran 20:114',
        sourceUrl: 'https://quran.com/20/114',
        emailBody: 'Thank you, added!',
      });
    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('approved');

    const lib = await request(app).get('/api/zikr/library');
    expect(lib.status).toBe(200);
    expect(lib.body.items.some((i) => i.name === 'Rabbi zidni ilma')).toBe(true);
  });

  test('approving an already-approved request is rejected with 409', async () => {
    const res = await request(app)
      .post(`/api/admin/zikr-requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Admin-Token', adminSessionToken)
      .send({
        name: 'x',
        arabic: 'x',
        meaning: 'x',
        source: 'x',
        sourceUrl: 'https://example.com',
        emailBody: 'x',
      });
    expect(res.status).toBe(409);
  });

  test('the requester now sees the approved request as unacknowledged, then acknowledges it', async () => {
    const mine = await request(app)
      .get('/api/zikr/requests/mine')
      .set('Authorization', `Bearer ${userToken}`);
    const approved = mine.body.requests.find((r) => r._id === requestId);
    expect(approved.status).toBe('approved');
    expect(approved.userAcknowledged).toBe(false);

    const ack = await request(app)
      .post(`/api/zikr/requests/${requestId}/ack`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(ack.status).toBe(200);

    const mineAfter = await request(app)
      .get('/api/zikr/requests/mine')
      .set('Authorization', `Bearer ${userToken}`);
    expect(mineAfter.body.requests.find((r) => r._id === requestId).userAcknowledged).toBe(true);
  });

  test("a user cannot acknowledge someone else's request", async () => {
    const res = await request(app)
      .post(`/api/zikr/requests/${requestId}/ack`)
      .set('Authorization', `Bearer ${otherUserToken}`);
    expect(res.status).toBe(404);
  });

  test('reject flow marks a pending request rejected without creating a library item', async () => {
    const submit = await request(app)
      .post('/api/zikr/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send(validRequestBody({ name: 'A rejected suggestion' }));
    const id = submit.body.request._id;

    const res = await request(app)
      .post(`/api/admin/zikr-requests/${id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Admin-Token', adminSessionToken)
      .send({ adminNote: 'Could not verify the source' });
    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('rejected');

    const lib = await request(app).get('/api/zikr/library');
    expect(lib.body.items.some((i) => i.name === 'A rejected suggestion')).toBe(false);
  });
});
