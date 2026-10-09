import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { MongoMemoryServer } from 'mongodb-memory-server';
import ZikrDaily from '../src/models/ZikrDaily.js';
import User from '../src/models/User.js';
import { BACKUP_VERSION } from '../src/services/backup.service.js';
import { DELETED_ACCOUNT_ID } from '../src/services/user.service.js';
import QuranReadingSession from '../src/models/QuranReadingSession.js';
import ZikrEvent from '../src/models/ZikrEvent.js';
import NaseehPlan from '../src/models/NaseehPlan.js';
import ClientOp from '../src/models/ClientOp.js';
import FeedbackMessage from '../src/models/FeedbackMessage.js';
import ZikrRequest from '../src/models/ZikrRequest.js';
import Donation from '../src/models/Donation.js';
import SocialProfile from '../src/models/SocialProfile.js';
import UpdateEmailCampaign from '../src/models/UpdateEmailCampaign.js';

// For tests, we'll use DEV_AUTH_BYPASS and a fake JWT with uid/email
const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

let mongo;

describe('User profile API', () => {
  beforeAll(async () => {
    process.env.DEV_AUTH_BYPASS = '1';
    mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri();
    await mongoose.connect(uri, { dbName: 'ihsan_test' });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
    if (mongo) await mongo.stop();
  });

  test('GET /api/user/me returns 401 without token', async () => {
    const res = await request(app).get('/api/user/me');
    expect(res.status).toBe(401);
  });

  test('PATCH /api/user/me creates/updates profile fields', async () => {
    const token = fakeJwt({ uid: 'u1', email: 'u1@test.dev' });

    // Upsert via verify (optional, but mirrors real flow)
    const verify = await request(app).post('/api/auth/verify').send({ idToken: token });
    expect(verify.status).toBe(200);

    const patch = await request(app)
      .patch('/api/user/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        displayName: 'Test User',
        photoUrl: 'https://example.com/a.png',
        gender: 'male',
        birthDate: '2000-01-01',
        occupation: 'Engineer',
      });
    expect(patch.status).toBe(200);
    expect(patch.body.user.displayName).toBe('Test User');
    expect(patch.body.user.gender).toBe('male');
    expect(patch.body.user.occupation).toBe('Engineer');

    const get = await request(app).get('/api/user/me').set('Authorization', `Bearer ${token}`);
    expect(get.status).toBe(200);
    expect(get.body.user.displayName).toBe('Test User');
  });

  test('PATCH /api/user/me rejects invalid gender enum', async () => {
    const token = fakeJwt({ uid: 'u2', email: 'u2@test.dev' });

    await request(app).post('/api/auth/verify').send({ idToken: token });

    const res = await request(app)
      .patch('/api/user/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ gender: 'invalid_value' });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  test('v4.9: export → import round-trips every domain (merge, imported wins)', async () => {
    const token = fakeJwt({ uid: 'bkp1', email: 'bkp1@test.dev', name: 'Backup' });
    const auth = (r) => r.set('Authorization', `Bearer ${token}`);
    await request(app).post('/api/auth/verify').send({ idToken: token });

    // Seed data across domains
    await auth(request(app).post('/api/zikr/increment/batch')).send({
      increments: [{ zikrType: 'SubhanAllah', amount: 33 }],
      timezoneOffset: 0,
      today: '2026-07-20',
    });
    await auth(request(app).post('/api/quran/read-ayat')).send({ date: '2026-07-20', count: 5 });
    await auth(request(app).put('/api/fasting/log')).send({
      date: '2026-07-20',
      category: 'voluntary',
      voluntaryKind: 'mon_thu',
      status: 'completed',
    });

    const exp = await auth(request(app).get('/api/user/export'));
    expect(exp.status).toBe(200);
    const backup = exp.body.backup;
    expect(backup.app).toBe('ihsan');
    expect(backup.version).toBe(BACKUP_VERSION);
    expect(backup.zikr.zikrTotals.SubhanAllah).toBe(33);
    expect(backup.quran.logs.length).toBe(1);
    expect(backup.fasting.logs.length).toBe(1);

    // Wipe zikr, then restore from the backup
    await auth(request(app).delete('/api/zikr/all'));
    const imp = await auth(request(app).post('/api/user/import')).send(backup);
    expect(imp.status).toBe(200);
    expect(imp.body.counts.zikrDays).toBe(1);

    const summary = await auth(request(app).get('/api/zikr/summary?timezoneOffset=0'));
    const perType = Object.fromEntries(summary.body.perType.map((p) => [p.zikrType, p.total]));
    expect(perType.SubhanAllah).toBe(33);

    // Garbage files are rejected
    const bad = await auth(request(app).post('/api/user/import')).send({ hello: 'world' });
    expect(bad.status).toBe(400);
  });

  test('DELETE /api/user/me purges Mongo data and succeeds without Firebase Admin configured', async () => {
    // This environment runs with DEV_AUTH_BYPASS and no Firebase service
    // account — deleteAccount() must not try to call admin.auth().deleteUser()
    // here (it would throw "app/no-app" and turn a successful purge into a
    // 500), and must skip that step cleanly instead.
    const token = fakeJwt({ uid: 'del1', email: 'del1@test.dev' });
    const auth = (r) => r.set('Authorization', `Bearer ${token}`);
    await request(app).post('/api/auth/verify').send({ idToken: token });

    await auth(request(app).patch('/api/user/me')).send({ displayName: 'Delete Me' });
    await auth(request(app).post('/api/zikr/increment/batch')).send({
      increments: [{ zikrType: 'SubhanAllah', amount: 10 }],
      timezoneOffset: 0,
      today: '2026-07-20',
    });

    const del = await auth(request(app).delete('/api/user/me'));
    expect(del.status).toBe(200);
    expect(del.body.ok).toBe(true);

    // The Mongo documents are actually gone, not just the API response looking clean.
    expect(await User.findOne({ uid: 'del1' })).toBeNull();
    expect(await ZikrDaily.countDocuments({ userId: 'del1' })).toBe(0);

    // A GET no longer finds a profile either.
    const get = await auth(request(app).get('/api/user/me'));
    expect(get.status).toBe(404);
  });

  test('DELETE /api/user/me removes personal rows, unlinks admin records and leaves other users alone', async () => {
    const me = 'purge1';
    const other = 'purge2';
    const token = fakeJwt({ uid: me, email: 'purge1@test.dev' });
    const auth = (r) => r.set('Authorization', `Bearer ${token}`);
    await request(app).post('/api/auth/verify').send({ idToken: token });

    // Raw inserts: this test is about who owns a row, not each schema's rules.
    const now = new Date();
    for (const uid of [me, other]) {
      await QuranReadingSession.collection.insertOne({
        userId: uid,
        clientSessionId: `s-${uid}`,
        date: '2026-10-01',
        startedAt: now,
        endedAt: now,
      });
      await ZikrEvent.collection.insertOne({
        userId: uid,
        zikrType: 'SubhanAllah',
        amount: 3,
        ts: now,
      });
      await NaseehPlan.collection.insertOne({ userId: uid, weekStart: '2026-09-28' });
      await ClientOp.collection.insertOne({
        uid,
        opId: `op-${uid}`,
        route: 'POST /x',
        status: 'done',
        createdAt: now,
      });
      await FeedbackMessage.collection.insertOne({
        name: `N ${uid}`,
        email: `${uid}@test.dev`,
        message: 'Salam',
        category: [],
        kind: 'feedback',
        userId: uid,
        status: 'open',
        ipAddress: '1.2.3.4',
      });
      await ZikrRequest.collection.insertOne({
        userId: uid,
        userEmail: `${uid}@test.dev`,
        name: 'Dua',
        status: 'pending',
      });
      await Donation.collection.insertOne({
        email: `${uid}@test.dev`,
        phone: '017',
        paymentMethod: 'bkash',
        transactionId: `TX${uid}`.toUpperCase(),
        amount: 100,
        transactionDate: now,
        userId: uid,
        status: 'verified',
      });
    }
    await SocialProfile.collection.insertOne({
      userId: other,
      friends: [me, 'third'],
      friendSince: { [me]: now, third: now },
      pendingIncoming: [me],
      pendingOutgoing: [],
      blocked: [me],
    });
    await UpdateEmailCampaign.collection.insertOne({
      subject: 'News',
      body: 'Hello',
      audience: 'all',
      createdBy: 'admin@test.dev',
      createdAt: now,
      recipients: [
        { uid: me, email: 'purge1@test.dev', name: 'Me', group: 'male', status: 'pending' },
        { uid: other, email: 'purge2@test.dev', name: 'Other', group: 'male', status: 'pending' },
      ],
    });

    const del = await auth(request(app).delete('/api/user/me'));
    expect(del.status).toBe(200);

    // Personal data: gone for me, untouched for the other user.
    for (const [Model, key] of [
      [QuranReadingSession, 'userId'],
      [ZikrEvent, 'userId'],
      [NaseehPlan, 'userId'],
      [ClientOp, 'uid'],
    ]) {
      expect(await Model.countDocuments({ [key]: me })).toBe(0);
      expect(await Model.countDocuments({ [key]: other })).toBe(1);
    }

    // Feedback kept as an anonymous message.
    expect(await FeedbackMessage.countDocuments({ userId: me })).toBe(0);
    const anonFeedback = await FeedbackMessage.findOne({ message: 'Salam', userId: null })
      .select('+ipAddress')
      .lean();
    expect(anonFeedback).toMatchObject({ name: 'Deleted account', email: '', ipAddress: null });
    expect(
      await FeedbackMessage.countDocuments({ userId: other, email: `${other}@test.dev` })
    ).toBe(1);

    // Zikr request kept, unlinked, no email.
    expect(await ZikrRequest.countDocuments({ userId: me })).toBe(0);
    const anonRequest = await ZikrRequest.findOne({ userId: DELETED_ACCOUNT_ID }).lean();
    expect(anonRequest.userEmail).toBeUndefined();
    expect(
      await ZikrRequest.countDocuments({ userId: other, userEmail: `${other}@test.dev` })
    ).toBe(1);

    // Donation kept as a money record, without the account link.
    expect(await Donation.countDocuments({ userId: me })).toBe(0);
    expect(
      await Donation.countDocuments({
        transactionId: `TX${me}`.toUpperCase(),
        userId: null,
        amount: 100,
      })
    ).toBe(1);
    expect(await Donation.countDocuments({ userId: other })).toBe(1);

    // The other user's friend list no longer points at me; their other friend stays.
    const otherSocial = await SocialProfile.collection.findOne({ userId: other });
    expect(otherSocial.friends).toEqual(['third']);
    expect(otherSocial.pendingIncoming).toEqual([]);
    expect(otherSocial.blocked).toEqual([]);
    expect(Object.keys(otherSocial.friendSince)).toEqual(['third']);

    // Campaign recipient scrubbed and no longer pending; the other recipient unchanged.
    const campaign = await UpdateEmailCampaign.collection.findOne({ subject: 'News' });
    expect(campaign.recipients[0]).toMatchObject({
      uid: DELETED_ACCOUNT_ID,
      email: '',
      name: 'Deleted account',
      status: 'failed',
    });
    expect(campaign.recipients[1]).toMatchObject({
      uid: other,
      email: 'purge2@test.dev',
      status: 'pending',
    });
  });

  test('DELETE /api/user/me rejects a stale auth_time with reauth_required', async () => {
    const staleAuthTime = Math.floor(Date.now() / 1000) - 10 * 60; // 10 minutes ago
    const token = fakeJwt({ uid: 'del2', email: 'del2@test.dev', auth_time: staleAuthTime });
    const auth = (r) => r.set('Authorization', `Bearer ${token}`);
    await request(app).post('/api/auth/verify').send({ idToken: token });

    const res = await auth(request(app).delete('/api/user/me'));
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('reauth_required');

    // Rejected before any purge happened.
    expect(await User.findOne({ uid: 'del2' })).not.toBeNull();
  });

  test('DELETE /api/user/me allows a fresh auth_time', async () => {
    const freshAuthTime = Math.floor(Date.now() / 1000) - 30; // 30 seconds ago
    const token = fakeJwt({ uid: 'del3', email: 'del3@test.dev', auth_time: freshAuthTime });
    const auth = (r) => r.set('Authorization', `Bearer ${token}`);
    await request(app).post('/api/auth/verify').send({ idToken: token });

    const res = await auth(request(app).delete('/api/user/me'));
    expect(res.status).toBe(200);
  });
});
