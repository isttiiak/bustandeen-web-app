import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import AdminAccount from '../src/models/AdminAccount.js';
import { sendAdminPasswordReset } from '../src/services/adminAccount.service.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};
const now = () => Math.floor(Date.now() / 1000);
const tokenFor = (uid, authTime) => fakeJwt({ uid, auth_time: authTime });

let mongo;
let ansarId;
let formerId;

describe('Admin passwords (U8.7)', () => {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_admin_password' });
    await AdminAccount.create({
      firebaseUid: 'pw-servant',
      email: 'servant@pw.dev',
      role: 'servant',
      createdBy: 'seed',
    });
    const ansar = await AdminAccount.create({
      firebaseUid: 'pw-ansar',
      email: 'ansar@pw.dev',
      displayName: 'Aminah',
      role: 'ansar',
      ansarDomain: 'general',
      createdBy: 'seed',
    });
    ansarId = ansar._id.toString();
    const former = await AdminAccount.create({
      firebaseUid: 'pw-former',
      email: 'former@pw.dev',
      role: 'ansar',
      ansarDomain: 'general',
      active: false,
      createdBy: 'seed',
    });
    formerId = former._id.toString();
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
    if (mongo) await mongo.stop();
  });

  describe('changing your own password', () => {
    test('needs a recent sign-in', async () => {
      const res = await request(app)
        .post('/api/admin/auth/password-changed')
        .set('X-Admin-Token', tokenFor('pw-ansar', now() - 3600));
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('admin_reauth_required');
    });

    test('ends every older sign-in and keeps this one', async () => {
      const older = tokenFor('pw-ansar', now() - 120);
      const current = tokenFor('pw-ansar', now() - 10);
      const res = await request(app)
        .post('/api/admin/auth/password-changed')
        .set('X-Admin-Token', current);
      expect(res.status).toBe(200);

      const stale = await request(app).get('/api/admin/auth/session').set('X-Admin-Token', older);
      expect(stale.status).toBe(401);
      expect(stale.body.error).toBe('admin_session_expired');
      const kept = await request(app).get('/api/admin/auth/session').set('X-Admin-Token', current);
      expect(kept.status).toBe(200);
    });
  });

  describe('sending a reset link', () => {
    const asServant = (r) => r.set('X-Admin-Token', tokenFor('pw-servant', now() - 10));

    test('is Servant-only', async () => {
      const res = await request(app)
        .post(`/api/admin/accounts/${ansarId}/password-reset`)
        .set('X-Admin-Token', tokenFor('pw-ansar', now() - 10));
      expect(res.status).toBe(403);
    });

    test('needs a recent sign-in', async () => {
      const res = await request(app)
        .post(`/api/admin/accounts/${ansarId}/password-reset`)
        .set('X-Admin-Token', tokenFor('pw-servant', now() - 3600));
      expect(res.body.error).toBe('admin_reauth_required');
    });

    test('unknown, malformed and deactivated accounts are refused', async () => {
      const unknown = await asServant(
        request(app).post(`/api/admin/accounts/${new mongoose.Types.ObjectId()}/password-reset`)
      );
      expect(unknown.status).toBe(404);
      const bad = await asServant(request(app).post('/api/admin/accounts/nope/password-reset'));
      expect(bad.status).toBe(400);
      const inactive = await asServant(
        request(app).post(`/api/admin/accounts/${formerId}/password-reset`)
      );
      expect(inactive.status).toBe(400);
    });

    test('without Firebase configured it says so instead of failing silently', async () => {
      const res = await asServant(
        request(app).post(`/api/admin/accounts/${ansarId}/password-reset`)
      );
      expect(res.status).toBe(503);
    });

    test('asks Firebase for a link for that account and emails it', async () => {
      const linker = {
        generatePasswordResetLink: jest.fn(async () => 'https://example.test/reset?x=1'),
      };
      // SMTP is not configured under test, so the send itself reports 502.
      await expect(sendAdminPasswordReset(ansarId, linker)).rejects.toMatchObject({ status: 502 });
      expect(linker.generatePasswordResetLink).toHaveBeenCalledWith('ansar@pw.dev');
    });
  });

  test('reactivating an account ends its older sign-ins', async () => {
    const before = tokenFor('pw-former', now() - 60);
    const res = await request(app)
      .patch(`/api/admin/accounts/${formerId}/active`)
      .set('X-Admin-Token', tokenFor('pw-servant', now() - 10))
      .send({ active: true });
    expect(res.status).toBe(200);
    const stale = await request(app).get('/api/admin/auth/session').set('X-Admin-Token', before);
    expect(stale.body.error).toBe('admin_session_expired');
  });
});
