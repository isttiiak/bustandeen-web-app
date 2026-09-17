import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import AdminAccount from '../src/models/AdminAccount.js';
import AdminAuditLog from '../src/models/AdminAuditLog.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

const SERVANT_EMAIL = 'servant@compose-test.dev';
const ANSAR_EMAIL = 'ansar@compose-test.dev';

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

let mongo;
let servantToken;
let ansarToken;

describe('Admin compose-email (servant only, always sends as istiak)', () => {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_admin_compose_email' });

    await AdminAccount.create({
      firebaseUid: 'servant-uid',
      email: SERVANT_EMAIL,
      role: 'servant',
      createdBy: 'test-seed',
    });
    await AdminAccount.create({
      firebaseUid: 'ansar-uid',
      email: ANSAR_EMAIL,
      role: 'ansar',
      ansarDomain: 'general',
      createdBy: 'test-seed',
    });
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

  const validPayload = {
    to: 'someone@example.com',
    subject: 'A note from Istiak',
    body: 'Assalamu Alaikum, just checking in.',
  };

  test('unauthenticated requests are rejected', async () => {
    const res = await request(app).post('/api/admin/compose-email/send').send(validPayload);
    expect(res.status).toBe(401);
  });

  test('an Ansar (even general-domain) cannot use this — servant only', async () => {
    const res = await request(app)
      .post('/api/admin/compose-email/send')
      .set('X-Admin-Token', ansarToken)
      .send(validPayload);
    expect(res.status).toBe(403);
  });

  test('rejects a malformed recipient address', async () => {
    const res = await request(app)
      .post('/api/admin/compose-email/send')
      .set('X-Admin-Token', servantToken)
      .send({ ...validPayload, to: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  test('rejects an empty subject or body', async () => {
    const res = await request(app)
      .post('/api/admin/compose-email/send')
      .set('X-Admin-Token', servantToken)
      .send({ ...validPayload, subject: '' });
    expect(res.status).toBe(400);
  });

  test('a valid send attempt reaches the mailer and fails loudly (not silently) when SMTP is unconfigured, and does not write an audit entry', async () => {
    // Test env has no ISTIAK_SMTP_USER/PASS set, matching every other email
    // flow's tests in this suite — sendMail no-ops and returns null, which
    // this endpoint (unlike every other sender) turns into an explicit
    // error instead of a false "ok" response, since sending IS the point.
    const res = await request(app)
      .post('/api/admin/compose-email/send')
      .set('X-Admin-Token', servantToken)
      .send(validPayload);
    expect(res.status).toBe(502);
    expect(res.body.ok).toBe(false);

    const entries = await AdminAuditLog.find({ action: 'email.compose.send' });
    expect(entries).toHaveLength(0);
  });
});
