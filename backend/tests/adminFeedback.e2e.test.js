import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import AdminAccount from '../src/models/AdminAccount.js';
import FeedbackMessage from '../src/models/FeedbackMessage.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

const SERVANT_EMAIL = 'servant@feedback-test.dev';
const GENERAL_ANSAR_EMAIL = 'general-ansar@feedback-test.dev';
const SADAQAH_ANSAR_EMAIL = 'sadaqah-ansar@feedback-test.dev';

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

let mongo;
let servantToken;
let generalAnsarToken;
let sadaqahAnsarToken;

const makeMessage = () =>
  FeedbackMessage.create({
    name: 'A user',
    email: 'a-user@example.com',
    message: 'Something worth reading, at least ten characters.',
    category: ['bug'],
    kind: 'feedback',
    userId: null,
    ipAddress: '127.0.0.1',
  });

describe('Admin feedback: mark replied externally', () => {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_admin_feedback' });

    await AdminAccount.create({
      firebaseUid: 'servant-uid',
      email: SERVANT_EMAIL,
      role: 'servant',
      createdBy: 'test-seed',
    });
    await AdminAccount.create({
      firebaseUid: 'general-ansar-uid',
      email: GENERAL_ANSAR_EMAIL,
      role: 'ansar',
      ansarDomain: 'general',
      createdBy: 'test-seed',
    });
    await AdminAccount.create({
      firebaseUid: 'sadaqah-ansar-uid',
      email: SADAQAH_ANSAR_EMAIL,
      role: 'ansar',
      ansarDomain: 'sadaqah',
      createdBy: 'test-seed',
    });
    servantToken = fakeJwt({ uid: 'servant-uid', email: SERVANT_EMAIL });
    generalAnsarToken = fakeJwt({ uid: 'general-ansar-uid', email: GENERAL_ANSAR_EMAIL });
    sadaqahAnsarToken = fakeJwt({ uid: 'sadaqah-ansar-uid', email: SADAQAH_ANSAR_EMAIL });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
    if (mongo) await mongo.stop();
  });

  test('unauthenticated requests are rejected', async () => {
    const msg = await makeMessage();
    const res = await request(app).patch(`/api/admin/feedback/${msg._id}/mark-replied-external`);
    expect(res.status).toBe(401);
  });

  test('a sadaqah-domain Ansar cannot touch general-domain feedback', async () => {
    const msg = await makeMessage();
    const res = await request(app)
      .patch(`/api/admin/feedback/${msg._id}/mark-replied-external`)
      .set('X-Admin-Token', sadaqahAnsarToken);
    expect(res.status).toBe(403);
  });

  test('a general-domain Ansar can mark a message replied without sending any email', async () => {
    const msg = await makeMessage();
    const res = await request(app)
      .patch(`/api/admin/feedback/${msg._id}/mark-replied-external`)
      .set('X-Admin-Token', generalAnsarToken);
    expect(res.status).toBe(200);
    expect(res.body.message.status).toBe('replied');
    expect(res.body.message.repliedBy).toBe(GENERAL_ANSAR_EMAIL);
    expect(res.body.message.repliedAt).toBeTruthy();
  });

  test('the Servant can also mark a message replied (domain bypass)', async () => {
    const msg = await makeMessage();
    const res = await request(app)
      .patch(`/api/admin/feedback/${msg._id}/mark-replied-external`)
      .set('X-Admin-Token', servantToken);
    expect(res.status).toBe(200);
    expect(res.body.message.status).toBe('replied');
  });

  test('a non-existent message id returns 404', async () => {
    const res = await request(app)
      .patch(`/api/admin/feedback/${new mongoose.Types.ObjectId()}/mark-replied-external`)
      .set('X-Admin-Token', servantToken);
    expect(res.status).toBe(404);
  });
});
