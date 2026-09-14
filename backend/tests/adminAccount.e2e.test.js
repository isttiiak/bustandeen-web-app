import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import AdminAccount from '../src/models/AdminAccount.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

const SERVANT_EMAIL = 'servant@test.dev';
const ANSAR_EMAIL = 'ansar@test.dev';

// Same dev-bypass fake-JWT shape as auth.e2e.test.js.
const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

let mongo;
let servantToken;
let ansarToken;
let ansarAccountId;

describe('Admin account management (servant only)', () => {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_admin_accounts' });

    await AdminAccount.create({
      firebaseUid: 'servant-uid',
      email: SERVANT_EMAIL,
      role: 'servant',
      createdBy: 'test-seed',
    });
    const ansar = await AdminAccount.create({
      firebaseUid: 'ansar-uid',
      email: ANSAR_EMAIL,
      role: 'ansar',
      createdBy: 'test-seed',
    });
    ansarAccountId = ansar._id.toString();
    servantToken = fakeJwt({ uid: 'servant-uid', email: SERVANT_EMAIL });
    ansarToken = fakeJwt({ uid: 'ansar-uid', email: ANSAR_EMAIL });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
    if (mongo) await mongo.stop();
  });

  test('unauthenticated requests are rejected', async () => {
    const res = await request(app).get('/api/admin/accounts');
    expect(res.status).toBe(401);
  });

  test('an Ansar cannot list admin accounts', async () => {
    const res = await request(app).get('/api/admin/accounts').set('X-Admin-Token', ansarToken);
    expect(res.status).toBe(403);
  });

  test('an Ansar cannot register a new admin', async () => {
    const res = await request(app)
      .post('/api/admin/accounts')
      .set('X-Admin-Token', ansarToken)
      .send({ email: 'new-ansar@test.dev', password: 'strongpassword1', role: 'ansar' });
    expect(res.status).toBe(403);
  });

  test('an Ansar cannot deactivate another account', async () => {
    const res = await request(app)
      .patch(`/api/admin/accounts/${ansarAccountId}/active`)
      .set('X-Admin-Token', ansarToken)
      .send({ active: false });
    expect(res.status).toBe(403);
  });

  test('the Servant sees both seeded accounts', async () => {
    const res = await request(app).get('/api/admin/accounts').set('X-Admin-Token', servantToken);
    expect(res.status).toBe(200);
    expect(res.body.accounts.map((a) => a.email).sort()).toEqual(
      [ANSAR_EMAIL, SERVANT_EMAIL].sort()
    );
  });

  test('the Servant deactivates the Ansar, and the Ansar loses access immediately', async () => {
    const deactivate = await request(app)
      .patch(`/api/admin/accounts/${ansarAccountId}/active`)
      .set('X-Admin-Token', servantToken)
      .send({ active: false });
    expect(deactivate.status).toBe(200);
    expect(deactivate.body.account.active).toBe(false);

    // The Ansar's Firebase identity is still "valid" (this is a dev-bypass
    // token, but the point holds for a real one too) — access is revoked by
    // the AdminAccount row alone, not by the token expiring.
    const stillBlocked = await request(app)
      .get('/api/admin/sadaqah/pending')
      .set('X-Admin-Token', ansarToken);
    expect(stillBlocked.status).toBe(401);
  });

  test('the Servant cannot deactivate their own account', async () => {
    const servantAccount = await AdminAccount.findOne({ email: SERVANT_EMAIL });
    const res = await request(app)
      .patch(`/api/admin/accounts/${servantAccount._id}/active`)
      .set('X-Admin-Token', servantToken)
      .send({ active: false });
    expect(res.status).toBe(400);
  });
});
