import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import AdminAccount from '../src/models/AdminAccount.js';
import AdminAuditLog from '../src/models/AdminAuditLog.js';
import User from '../src/models/User.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

// T4.1 (FEAT-03, FIQH-02): national moon-sighting records (Servant only,
// audit-logged, public read) and the user's own Hijri offset winning over
// them: legacy accounts keep a non-zero offset as their own choice.

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

const SERVANT = 'servant@moon-test.dev';
const ANSAR = 'ansar@moon-test.dev';
let mongo;
let servantToken;
let ansarToken;

const asServant = (r) => r.set('x-admin-token', servantToken);
const asAnsar = (r) => r.set('x-admin-token', ansarToken);
const userTok = (uid) => fakeJwt({ uid, email: `${uid}@test.dev`, name: uid });
const asUser = (uid) => (r) => r.set('Authorization', `Bearer ${userTok(uid)}`);

const BD = {
  country: 'BD',
  effectiveFrom: '2027-02-08',
  offset: -1,
  note: 'National Moon Sighting Committee: Ramadan begins one day after Saudi Arabia.',
};

describe('Moon-sighting overrides (T4.1)', () => {
  beforeAll(async () => {
    process.env.DEV_AUTH_BYPASS = '1';
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_moon' });
    await AdminAccount.create({
      firebaseUid: 'servant-uid',
      email: SERVANT,
      role: 'servant',
      createdBy: 'test-seed',
    });
    await AdminAccount.create({
      firebaseUid: 'ansar-uid',
      email: ANSAR,
      role: 'ansar',
      ansarDomain: 'general',
      createdBy: 'test-seed',
    });
    servantToken = fakeJwt({ uid: 'servant-uid', email: SERVANT });
    ansarToken = fakeJwt({ uid: 'ansar-uid', email: ANSAR });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
    if (mongo) await mongo.stop();
  });

  test('the public list starts empty and needs no sign-in', async () => {
    const res = await request(app).get('/api/calendar/moon-sighting');
    expect(res.status).toBe(200);
    expect(res.body.records).toEqual([]);
    expect(res.headers['cache-control']).toMatch(/max-age/);
  });

  test('only a Servant can add a record', async () => {
    expect((await request(app).post('/api/admin/moon-sighting').send(BD)).status).toBe(401);
    const ansar = await asAnsar(request(app).post('/api/admin/moon-sighting')).send(BD);
    expect(ansar.status).toBe(403);
    expect(await AdminAuditLog.countDocuments({ action: /moonSighting/ })).toBe(0);
  });

  test('input is validated: code, date, range, https source, no extra fields', async () => {
    for (const bad of [
      { ...BD, country: 'Bangladesh' },
      { ...BD, effectiveFrom: '8 Feb 2027' },
      { ...BD, offset: 2 },
      { ...BD, offset: 0.5 },
      { ...BD, note: '' },
      { ...BD, sourceUrl: 'http://example.com' },
      { ...BD, createdBy: 'someone' },
    ]) {
      const res = await asServant(request(app).post('/api/admin/moon-sighting')).send(bad);
      expect(res.status).toBe(400);
    }
  });

  let recordId;
  test('a Servant adds a record: audit-logged and public', async () => {
    const res = await asServant(request(app).post('/api/admin/moon-sighting')).send({
      ...BD,
      sourceUrl: 'https://example.com/announcement',
    });
    expect(res.status).toBe(201);
    recordId = res.body.record._id;
    expect(res.body.record.createdBy).toBe(SERVANT);

    const log = await AdminAuditLog.findOne({ action: 'moonSighting.create' });
    expect(log.actorEmail).toBe(SERVANT);
    expect(log.targetId).toBe(recordId);
    expect(log.metadata).toEqual({ country: 'BD', effectiveFrom: '2027-02-08', offset: -1 });

    const pub = await request(app).get('/api/calendar/moon-sighting');
    expect(pub.body.records).toEqual([
      {
        id: recordId,
        country: 'BD',
        effectiveFrom: '2027-02-08',
        offset: -1,
        note: BD.note,
        sourceUrl: 'https://example.com/announcement',
      },
    ]);
    // Who added it stays in the admin view only
    expect(JSON.stringify(pub.body)).not.toContain(SERVANT);
  });

  test('deactivating hides it publicly but keeps it, audited', async () => {
    const ansar = await asAnsar(
      request(app).patch(`/api/admin/moon-sighting/${recordId}/deactivate`)
    );
    expect(ansar.status).toBe(403);

    const res = await asServant(
      request(app).patch(`/api/admin/moon-sighting/${recordId}/deactivate`)
    );
    expect(res.status).toBe(200);
    expect(res.body.record.active).toBe(false);
    expect((await request(app).get('/api/calendar/moon-sighting')).body.records).toEqual([]);

    const admin = await asServant(request(app).get('/api/admin/moon-sighting'));
    expect(admin.body.records).toHaveLength(1);
    expect(admin.body.records[0].deactivatedBy).toBe(SERVANT);
    expect(await AdminAuditLog.countDocuments({ action: 'moonSighting.deactivate' })).toBe(1);

    const again = await asServant(
      request(app).patch(`/api/admin/moon-sighting/${recordId}/deactivate`)
    );
    expect(again.status).toBe(404);
  });

  test('legacy accounts: a non-zero offset stays their own, zero follows the country', async () => {
    for (const uid of ['legacyMinus', 'legacyZero']) {
      await request(app)
        .post('/api/auth/verify')
        .send({ idToken: userTok(uid) });
    }
    // Exactly as stored before T4.1: an offset, no hijriOffsetSet flag
    await User.collection.updateOne({ uid: 'legacyMinus' }, { $set: { hijriOffset: -1 } });
    await User.collection.updateOne({ uid: 'legacyZero' }, { $set: { hijriOffset: 0 } });
    const before = await User.collection
      .find({ uid: { $in: ['legacyMinus', 'legacyZero'] } })
      .toArray();
    expect(before.every((u) => u.hijriOffsetSet === undefined)).toBe(true);

    const minus = await request(app)
      .post('/api/auth/verify')
      .send({ idToken: userTok('legacyMinus') });
    expect(minus.body.user.hijriOffset).toBe(-1);
    expect(minus.body.user.hijriManual).toBe(true);
    const zero = await asUser('legacyZero')(request(app).get('/api/user/me'));
    expect(zero.body.user.hijriOffset).toBe(0);
    expect(zero.body.user.hijriManual).toBe(false);

    // Reading never rewrites the stored values
    const after = await User.collection
      .find({ uid: { $in: ['legacyMinus', 'legacyZero'] } })
      .toArray();
    for (const u of after) {
      const b = before.find((x) => x.uid === u.uid);
      expect(u.hijriOffset).toBe(b.hijriOffset);
      expect(u.hijriOffsetSet).toBeUndefined();
    }
  });

  test('choosing an offset (even 0) is manual; null switches back to Automatic', async () => {
    const zero = await asUser('legacyZero')(request(app).patch('/api/user/me')).send({
      hijriOffset: 0,
    });
    expect(zero.body.user.hijriManual).toBe(true);

    const plus = await asUser('legacyZero')(request(app).patch('/api/user/me')).send({
      hijriOffset: 1,
    });
    expect(plus.body.user).toMatchObject({ hijriOffset: 1, hijriManual: true });

    const auto = await asUser('legacyZero')(request(app).patch('/api/user/me')).send({
      hijriOffset: null,
    });
    expect(auto.body.user).toMatchObject({ hijriOffset: 0, hijriManual: false });
    const doc = await User.findOne({ uid: 'legacyZero' });
    expect(doc.hijriOffsetSet).toBe(false);

    const bad = await asUser('legacyZero')(request(app).patch('/api/user/me')).send({
      hijriOffset: 2,
    });
    expect(bad.status).toBe(400);
  });
});
