import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../src/models/User.js';
import ZikrDaily from '../src/models/ZikrDaily.js';
import SalatLog from '../src/models/SalatLog.js';
import HifzEntry from '../src/models/HifzEntry.js';
import CycleDay from '../src/models/CycleDay.js';
import Donation from '../src/models/Donation.js';
import FeedbackMessage from '../src/models/FeedbackMessage.js';
import SocialProfile from '../src/models/SocialProfile.js';
import { encryptJson } from '../src/utils/fieldCrypto.js';

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

let mongo;
const A = { uid: 'export-a', email: 'export-a@test.dev' };
const B = { uid: 'export-b', email: 'export-b@test.dev' };
const tokenA = fakeJwt(A);

describe('Full account data export', () => {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_export_test' });
    await User.create({
      ...A,
      displayName: 'Export A',
      groqApiKeyEnc: 'SECRET-CIPHERTEXT',
      groqApiKeySetAt: new Date('2026-09-01'),
    });
    await User.create({ ...B, displayName: 'Export B' });

    await ZikrDaily.create({
      userId: A.uid,
      date: new Date('2026-09-01'),
      zikrType: 'SubhanAllah',
      count: 33,
    });
    await ZikrDaily.create({
      userId: B.uid,
      date: new Date('2026-09-01'),
      zikrType: 'SubhanAllah',
      count: 987654,
    });
    await SalatLog.create({ userId: A.uid, date: '2026-09-01' });
    await HifzEntry.create({ userId: A.uid, surah: 1, ayah: 1, dueDate: '2026-09-02' });
    await CycleDay.create({
      userId: A.uid,
      date: '2026-09-02',
      enc: encryptJson({ flow: 'light', symptoms: ['cramps'], moods: [], garden: [] }),
    });
    await Donation.create({
      donorName: 'Export A',
      email: A.email,
      phone: '01712345678',
      paymentMethod: 'bkash',
      transactionId: 'EXPORTTX1',
      amount: 100,
      transactionDate: new Date('2026-09-03'),
      ipAddress: '203.0.113.9',
      emailMessageId: '<internal@bustandeen.com>',
    });
    await Donation.create({
      donorName: 'Someone Else',
      email: B.email,
      phone: '01712345679',
      paymentMethod: 'bkash',
      transactionId: 'EXPORTTX2',
      amount: 200,
      transactionDate: new Date('2026-09-03'),
    });
    await FeedbackMessage.create({
      name: 'Export A',
      email: A.email,
      message: 'hello',
      kind: 'feedback',
      userId: A.uid,
      adminNote: 'INTERNAL NOTE',
    });
    await SocialProfile.create({
      userId: A.uid,
      inviteCode: 'EXPA1',
      friends: [B.uid],
    });
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect().catch(() => {});
    if (mongo) await mongo.stop();
  });

  test('requires sign-in', async () => {
    const res = await request(app).get('/api/user/export/all');
    expect(res.status).toBe(401);
  });

  test('returns every feature for the caller and only the caller', async () => {
    const res = await request(app)
      .get('/api/user/export/all')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.kind).toBe('full-account-data-export');
    expect(d.account.email).toBe(A.email);
    expect(d.zikr.daily).toHaveLength(1);
    expect(d.zikr.daily[0].count).toBe(33);
    expect(d.salat.logs).toHaveLength(1);
    expect(d.hifz.entries).toHaveLength(1);
    expect(d.messagesToUs).toHaveLength(1);
    expect(d.sadaqahSubmissions).toHaveLength(1);
    expect(d.sadaqahSubmissions[0].transactionId).toBe('EXPORTTX1');
  });

  test('decrypts Rayhanah notes for the owner', async () => {
    const res = await request(app)
      .get('/api/user/export/all')
      .set('Authorization', `Bearer ${tokenA}`);
    const day = res.body.data.rayhanah.days[0];
    expect(day.flow).toBe('light');
    expect(day.symptoms).toEqual(['cramps']);
    expect(day.enc).toBeUndefined();
  });

  test('never leaks secrets, internal notes or other people', async () => {
    const res = await request(app)
      .get('/api/user/export/all')
      .set('Authorization', `Bearer ${tokenA}`);
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain('SECRET-CIPHERTEXT');
    expect(raw).not.toContain('INTERNAL NOTE');
    expect(raw).not.toContain('203.0.113.9');
    expect(raw).not.toContain('internal@bustandeen.com');
    expect(raw).not.toContain('Someone Else');
    expect(raw).not.toContain(B.uid);
    expect(raw).not.toContain('987654');
    expect(res.body.data.preferences.ownGroqKey.saved).toBe(true);
    expect(res.body.data.friends.friendCount).toBe(1);
  });
});
