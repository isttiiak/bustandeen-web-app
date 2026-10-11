import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import AdminAccount from '../src/models/AdminAccount.js';
import AdminAuditLog from '../src/models/AdminAuditLog.js';
import { base32Decode, hotp, totpStep } from '../src/utils/totp.js';
import { issueMfaProof } from '../src/utils/adminMfaProof.js';

// T1.4: admin routes need a second factor. setupTests.js normally marks seeded
// admins as enrolled and attaches a proof; here every account is seeded with
// totpSecretEnc: null and every request sets X-Admin-MFA itself (after the
// token), so the real enforcement is what runs.

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};
const nowSec = () => Math.floor(Date.now() / 1000);
const tokenFor = (uid, signedInAgo = 10) => fakeJwt({ uid, auth_time: nowSec() - signedInAgo });

const as = (req, uid, proof = '', signedInAgo = 10) =>
  req.set('X-Admin-Token', tokenFor(uid, signedInAgo)).set('X-Admin-MFA', proof);

const codeAt = (secret, offsetSteps = 0) => hotp(base32Decode(secret), totpStep() + offsetSteps);

let mongo;
let ansarId;

describe('Admin TOTP second factor (T1.4)', () => {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_admin_mfa' });
    await AdminAccount.create({
      firebaseUid: 'mfa-servant',
      email: 'servant@test.dev',
      role: 'servant',
      createdBy: 'test-seed',
      totpSecretEnc: null,
    });
    const ansar = await AdminAccount.create({
      firebaseUid: 'mfa-ansar',
      email: 'ansar@test.dev',
      role: 'ansar',
      ansarDomain: 'general',
      createdBy: 'test-seed',
      totpSecretEnc: null,
    });
    ansarId = ansar._id.toString();
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
    if (mongo) await mongo.stop();
  });

  // Enrols `uid` and returns { secret, proof, backupCodes, usedStep }.
  const enrol = async (uid) => {
    const start = await as(request(app).post('/api/admin/auth/mfa/enroll/start'), uid);
    expect(start.status).toBe(200);
    const confirm = await as(request(app).post('/api/admin/auth/mfa/enroll/confirm'), uid).send({
      code: codeAt(start.body.secret),
    });
    expect(confirm.status).toBe(200);
    return {
      secret: start.body.secret,
      proof: confirm.body.mfaProof,
      backupCodes: confirm.body.backupCodes,
    };
  };

  let servant;

  test('an admin without an authenticator gets 403 mfa_required (enroll) on data routes', async () => {
    const res = await as(request(app).get('/api/admin/accounts'), 'mfa-servant');
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ ok: false, error: 'mfa_required', mfa: 'enroll' });
  });

  test('the session route still answers, and reports enroll', async () => {
    const res = await as(request(app).get('/api/admin/auth/session'), 'mfa-servant');
    expect(res.status).toBe(200);
    expect(res.body.mfa).toBe('enroll');
    expect(res.body.role).toBe('servant');
  });

  test('enrolment start needs a fresh password entry', async () => {
    const res = await as(
      request(app).post('/api/admin/auth/mfa/enroll/start'),
      'mfa-servant',
      '',
      60 * 60
    );
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('admin_reauth_required');
  });

  test('a wrong first code does not enrol', async () => {
    const start = await as(request(app).post('/api/admin/auth/mfa/enroll/start'), 'mfa-servant');
    expect(start.status).toBe(200);
    expect(start.body.otpauthUri).toContain('otpauth://totp/');
    const wrong = String((Number(codeAt(start.body.secret)) + 1) % 1_000_000).padStart(6, '0');
    const res = await as(
      request(app).post('/api/admin/auth/mfa/enroll/confirm'),
      'mfa-servant'
    ).send({ code: wrong });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('mfa_code_invalid');
    const account = await AdminAccount.findOne({ firebaseUid: 'mfa-servant' });
    expect(account.totpSecretEnc).toBeNull();
  });

  test('a correct first code enrols: secret stored encrypted, 8 backup codes, a working proof', async () => {
    servant = await enrol('mfa-servant');
    expect(servant.backupCodes).toHaveLength(8);
    const account = await AdminAccount.findOne({ firebaseUid: 'mfa-servant' });
    expect(account.totpSecretEnc).toBeTruthy();
    expect(account.totpSecretEnc).not.toContain(servant.secret);
    expect(account.backupCodeHashes).toHaveLength(8);
    expect(account.backupCodeHashes).not.toContain(servant.backupCodes[0]);
    expect(account.totpPendingSecretEnc).toBeNull();
    expect(account.mfaVersion).toBe(1);

    const res = await as(request(app).get('/api/admin/accounts'), 'mfa-servant', servant.proof);
    expect(res.status).toBe(200);
    expect(res.body.accounts.find((a) => a.email === 'servant@test.dev').mfaEnabled).toBe(true);
    expect(res.body.accounts.find((a) => a.email === 'ansar@test.dev').mfaEnabled).toBe(false);
    expect(await AdminAuditLog.countDocuments({ action: 'account.mfaEnrolled' })).toBe(1);
  });

  test('enrolling again is refused while enrolled', async () => {
    const res = await as(request(app).post('/api/admin/auth/mfa/enroll/start'), 'mfa-servant');
    expect(res.status).toBe(409);
  });

  test('without a proof the session asks for a code (verify)', async () => {
    const res = await as(request(app).get('/api/admin/accounts'), 'mfa-servant');
    expect(res.status).toBe(403);
    expect(res.body.mfa).toBe('verify');
    const session = await as(request(app).get('/api/admin/auth/session'), 'mfa-servant');
    expect(session.body.mfa).toBe('verify');
  });

  test('a proof for another admin, a pre-enrolment proof or a forged one never passes', async () => {
    for (const proof of [
      issueMfaProof('mfa-ansar', 1),
      issueMfaProof('mfa-servant', 0),
      `${servant.proof.split('.')[0]}.AAAA`,
    ]) {
      const res = await as(request(app).get('/api/admin/accounts'), 'mfa-servant', proof);
      expect(res.status).toBe(403);
    }
  });

  test('a proof older than 12 hours has expired', async () => {
    const old = issueMfaProof('mfa-servant', 1, Date.now() - 13 * 3600 * 1000);
    const res = await as(request(app).get('/api/admin/accounts'), 'mfa-servant', old);
    expect(res.status).toBe(403);
  });

  test('an authenticator code is accepted once: the enrolment code cannot be replayed', async () => {
    const account = await AdminAccount.findOne({ firebaseUid: 'mfa-servant' });
    const used = hotp(base32Decode(servant.secret), account.totpLastStep);
    const replay = await as(request(app).post('/api/admin/auth/mfa/verify'), 'mfa-servant').send({
      code: used,
    });
    expect(replay.status).toBe(400);

    const next = hotp(base32Decode(servant.secret), account.totpLastStep + 1);
    const ok = await as(request(app).post('/api/admin/auth/mfa/verify'), 'mfa-servant').send({
      code: next,
    });
    expect(ok.status).toBe(200);
    expect(ok.body.usedBackupCode).toBe(false);
    const again = await as(request(app).post('/api/admin/auth/mfa/verify'), 'mfa-servant').send({
      code: next,
    });
    expect(again.status).toBe(400);

    const res = await as(request(app).get('/api/admin/accounts'), 'mfa-servant', ok.body.mfaProof);
    expect(res.status).toBe(200);
  });

  test('a backup code works once (any case, with or without the dash) and is audit-logged', async () => {
    const code = servant.backupCodes[3].toLowerCase().replace('-', '');
    const ok = await as(request(app).post('/api/admin/auth/mfa/verify'), 'mfa-servant').send({
      code,
    });
    expect(ok.status).toBe(200);
    expect(ok.body.usedBackupCode).toBe(true);
    expect(ok.body.backupCodesLeft).toBe(7);
    const again = await as(request(app).post('/api/admin/auth/mfa/verify'), 'mfa-servant').send({
      code: servant.backupCodes[3],
    });
    expect(again.status).toBe(400);
    const log = await AdminAuditLog.findOne({ action: 'account.mfaBackupCodeUsed' });
    expect(log.metadata.backupCodesLeft).toBe(7);
  });

  test('a password change hands back a fresh proof that still works', async () => {
    const res = await as(
      request(app).post('/api/admin/auth/password-changed'),
      'mfa-servant',
      servant.proof
    );
    expect(res.status).toBe(200);
    const after = await as(
      request(app).get('/api/admin/accounts'),
      'mfa-servant',
      res.body.mfaProof
    );
    expect(after.status).toBe(200);
    servant.proof = res.body.mfaProof;
  });

  test('only the Servant can reset an admin, and the reset voids their proofs', async () => {
    const ansar = await enrol('mfa-ansar');
    const before = await as(request(app).get('/api/admin/feedback'), 'mfa-ansar', ansar.proof);
    expect(before.status).toBe(200);

    const denied = await as(
      request(app).post(`/api/admin/accounts/${ansarId}/mfa-reset`),
      'mfa-ansar',
      ansar.proof
    );
    expect(denied.status).toBe(403);
    expect(denied.body.error).not.toBe('mfa_required');

    const reset = await as(
      request(app).post(`/api/admin/accounts/${ansarId}/mfa-reset`),
      'mfa-servant',
      servant.proof
    );
    expect(reset.status).toBe(200);
    const account = await AdminAccount.findById(ansarId);
    expect(account.totpSecretEnc).toBeNull();
    expect(account.backupCodeHashes).toHaveLength(0);
    expect(await AdminAuditLog.countDocuments({ action: 'account.mfaReset' })).toBe(1);

    const after = await as(request(app).get('/api/admin/auth/session'), 'mfa-ansar', ansar.proof);
    expect(after.body.mfa).toBe('enroll');
    const blocked = await as(request(app).get('/api/admin/feedback'), 'mfa-ansar', ansar.proof);
    expect(blocked.status).toBe(403);
    expect(blocked.body.mfa).toBe('enroll');
  });

  test('a code for an account that is not enrolled is refused', async () => {
    const res = await as(request(app).post('/api/admin/auth/mfa/verify'), 'mfa-ansar').send({
      code: '123456',
    });
    expect(res.status).toBe(409);
  });

  test('a non-admin Firebase identity gets 401 on the MFA routes', async () => {
    const res = await as(request(app).post('/api/admin/auth/mfa/verify'), 'nobody').send({
      code: '123456',
    });
    expect(res.status).toBe(401);
  });
});
