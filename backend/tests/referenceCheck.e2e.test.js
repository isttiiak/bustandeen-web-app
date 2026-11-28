import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import AdminAccount from '../src/models/AdminAccount.js';
import AdminAuditLog from '../src/models/AdminAuditLog.js';
import ReferenceCheck from '../src/models/ReferenceCheck.js';
import { clearCheck, saveCheck } from '../src/services/referenceCheck.service.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

// v5.193.0: manual checks on the reference map (/references) are set by the
// Servant from the admin panel and shown on the public page at once. Only the
// Servant may set or clear one; every change is audit-logged with the values
// before and after; the public list needs no sign-in.

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

const SERVANT = 'servant@refcheck-test.dev';
const servantToken = fakeJwt({ uid: 'servant-uid', email: SERVANT });
const ansarToken = fakeJwt({ uid: 'ansar-uid', email: 'ansar@refcheck-test.dev' });
const userToken = fakeJwt({ uid: 'user-uid', email: 'user@refcheck-test.dev', name: 'u' });
const asServant = (r) => r.set('x-admin-token', servantToken);
const asAnsar = (r) => r.set('x-admin-token', ansarToken);

const MARK = {
  refId: 'bukhari:1166',
  status: 'source-verified',
  by: 'Istiak',
  date: '2026-11-28',
  note: 'Read on sunnah.com: Jābir, Istikhārah taught like a sūrah.',
};

let mongo;

describe('Reference checks (manual marks on /references)', () => {
  beforeAll(async () => {
    process.env.DEV_AUTH_BYPASS = '1';
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_refcheck' });
    await ReferenceCheck.syncIndexes();
    await AdminAccount.create({
      firebaseUid: 'servant-uid',
      email: SERVANT,
      role: 'servant',
      createdBy: 'test-seed',
    });
    await AdminAccount.create({
      firebaseUid: 'ansar-uid',
      email: 'ansar@refcheck-test.dev',
      role: 'ansar',
      ansarDomain: 'general',
      createdBy: 'test-seed',
    });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
    if (mongo) await mongo.stop();
  });

  test('the public list starts empty, needs no sign-in, and may be cached briefly', async () => {
    const res = await request(app).get('/api/references/checks');
    expect(res.status).toBe(200);
    expect(res.body.checks).toEqual({});
    expect(res.headers['cache-control']).toMatch(/max-age=60/);
  });

  test('only the Servant may set a check', async () => {
    expect((await request(app).put('/api/admin/references/checks').send(MARK)).status).toBe(401);
    const user = await request(app)
      .put('/api/admin/references/checks')
      .set('Authorization', `Bearer ${userToken}`)
      .send(MARK);
    expect(user.status).toBe(401);
    const ansar = await asAnsar(request(app).put('/api/admin/references/checks')).send(MARK);
    expect(ansar.status).toBe(403);
    const list = await asAnsar(request(app).get('/api/admin/references/checks'));
    expect(list.status).toBe(403);
    expect(await ReferenceCheck.countDocuments()).toBe(0);
    expect(await AdminAuditLog.countDocuments({ action: /^reference\./ })).toBe(0);
  });

  test('input is validated: id, status, who, date, note length, no extra fields', async () => {
    for (const bad of [
      { ...MARK, refId: 'Bukhari 1166' },
      { ...MARK, refId: { $ne: null } },
      { ...MARK, status: 'verified' },
      { ...MARK, by: '   ' },
      { ...MARK, date: '28 Nov 2026' },
      { ...MARK, note: 'x'.repeat(1001) },
      { ...MARK, updatedBy: 'someone' },
    ]) {
      const res = await asServant(request(app).put('/api/admin/references/checks')).send(bad);
      expect(res.status).toBe(400);
    }
    expect(await ReferenceCheck.countDocuments()).toBe(0);
  });

  test('the Servant sets a check: saved, audit-logged, public at once', async () => {
    const res = await asServant(request(app).put('/api/admin/references/checks')).send(MARK);
    expect(res.status).toBe(200);
    expect(res.body.check).toEqual({
      status: 'source-verified',
      by: 'Istiak',
      date: '2026-11-28',
      note: MARK.note,
    });

    const log = await AdminAuditLog.findOne({ action: 'reference.check' });
    expect(log.actorEmail).toBe(SERVANT);
    expect(log.targetId).toBe('bukhari:1166');
    expect(log.metadata.before).toBeNull();
    expect(log.metadata.after.status).toBe('source-verified');

    const pub = await request(app).get('/api/references/checks');
    expect(pub.body.checks).toEqual({ 'bukhari:1166': res.body.check });
  });

  test('saving again replaces the check (one per reference) and logs before and after', async () => {
    const res = await asServant(request(app).put('/api/admin/references/checks')).send({
      refId: 'bukhari:1166',
      status: 'scholar-confirmed',
      by: 'Shaykh Example',
      date: '2026-11-29',
    });
    expect(res.status).toBe(200);
    expect(res.body.check).toEqual({
      status: 'scholar-confirmed',
      by: 'Shaykh Example',
      date: '2026-11-29',
    });
    expect(await ReferenceCheck.countDocuments()).toBe(1);
    const log = await AdminAuditLog.findOne({ action: 'reference.check' }).sort({ createdAt: -1 });
    expect(log.metadata.before.status).toBe('source-verified');
    expect(log.metadata.after.status).toBe('scholar-confirmed');
  });

  test('ids with colons and dashes work in the path when clearing', async () => {
    await asServant(request(app).put('/api/admin/references/checks')).send({
      ...MARK,
      refId: 'quran:2:184',
    });
    const res = await asServant(
      request(app).delete(`/api/admin/references/checks/${encodeURIComponent('quran:2:184')}`)
    );
    expect(res.status).toBe(200);
    expect(await ReferenceCheck.findOne({ refId: 'quran:2:184' })).toBeNull();
  });

  test('clearing removes the check, logs what it was, and a second clear is a 404', async () => {
    const ansar = await asAnsar(request(app).delete('/api/admin/references/checks/bukhari:1166'));
    expect(ansar.status).toBe(403);

    const res = await asServant(request(app).delete('/api/admin/references/checks/bukhari:1166'));
    expect(res.status).toBe(200);
    const log = await AdminAuditLog.findOne({
      action: 'reference.clear',
      targetId: 'bukhari:1166',
    });
    expect(log.metadata.before.by).toBe('Shaykh Example');

    const again = await asServant(request(app).delete('/api/admin/references/checks/bukhari:1166'));
    expect(again.status).toBe(404);
    expect((await request(app).get('/api/references/checks')).body.checks).toEqual({});
  });

  test('the service itself refuses an operator or malformed id (not only the route)', async () => {
    await expect(clearCheck({ $ne: null })).rejects.toThrow('Not a reference id');
    await expect(clearCheck('Bukhari 1166')).rejects.toThrow('Not a reference id');
    await expect(saveCheck({ ...MARK, refId: { $gt: '' } }, SERVANT)).rejects.toThrow(
      'Not a reference id'
    );
    expect(await ReferenceCheck.countDocuments()).toBe(0);
  });

  test('the audit log groups these under "references"', async () => {
    const res = await asServant(request(app).get('/api/admin/audit-log?area=references'));
    expect(res.status).toBe(200);
    expect(res.body.entries.length).toBeGreaterThanOrEqual(4);
    for (const e of res.body.entries) expect(e.action).toMatch(/^reference\./);
  });
});
