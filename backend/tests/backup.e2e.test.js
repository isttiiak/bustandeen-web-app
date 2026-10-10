import request from 'supertest';
import mongoose from 'mongoose';
import { gzipSync } from 'node:zlib';
import app from '../src/app.js';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../src/models/User.js';
import ZikrDaily from '../src/models/ZikrDaily.js';
import ZikrGoal from '../src/models/ZikrGoal.js';
import ZikrStreak from '../src/models/ZikrStreak.js';
import ZikrEvent from '../src/models/ZikrEvent.js';
import SalatLog from '../src/models/SalatLog.js';
import SalatDebt from '../src/models/SalatDebt.js';
import SalatDebtEvent from '../src/models/SalatDebtEvent.js';
import KazaUnit from '../src/models/KazaUnit.js';
import FastingLog from '../src/models/FastingLog.js';
import FastingProfile from '../src/models/FastingProfile.js';
import AdhkarDay from '../src/models/AdhkarDay.js';
import QuranLog from '../src/models/QuranLog.js';
import QuranProfile from '../src/models/QuranProfile.js';
import QuranReadingSession from '../src/models/QuranReadingSession.js';
import HifzEntry from '../src/models/HifzEntry.js';
import HifzLog from '../src/models/HifzLog.js';
import HifzProfile from '../src/models/HifzProfile.js';
import NaseehPlan from '../src/models/NaseehPlan.js';
import CycleLog from '../src/models/CycleLog.js';
import CycleDay from '../src/models/CycleDay.js';
import CycleProfile from '../src/models/CycleProfile.js';
import SocialProfile from '../src/models/SocialProfile.js';
import Donation from '../src/models/Donation.js';
import FeedbackMessage from '../src/models/FeedbackMessage.js';
import { encryptJson, decryptJson } from '../src/utils/fieldCrypto.js';
import { purgeAccountData } from '../src/services/user.service.js';

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

let mongo;
const A = { uid: 'backup-a', email: 'backup-a@test.dev' };
const B = { uid: 'backup-b', email: 'backup-b@test.dev' };
const tokenA = fakeJwt(A);
const asA = (r) => r.set('Authorization', `Bearer ${tokenA}`);
const exportA = async () => {
  const res = await asA(request(app).get('/api/user/export'));
  expect(res.status).toBe(200);
  return res.body.backup;
};
/** Everything a restore must bring back: the file minus its timestamp and the
 * read-only records (those are not restorable by design). */
const restorable = (file) => {
  const { exportedAt, records, ...rest } = file;
  return rest;
};

/** One of every per-user record, so the round trip covers every model. */
async function seedEverything(uid, email) {
  await User.create({
    uid,
    email,
    displayName: 'Backup A',
    firstName: 'Amina',
    lastName: 'Rahman',
    occupation: 'Teacher',
    gender: 'female',
    birthDate: new Date('1995-03-04'),
    bio: 'Bismillah',
    city: 'Dhaka',
    country: 'BD',
    avatarId: 'leaf',
    hijriOffset: -1,
    hijriOffsetSet: true,
    dayStartMode: 'maghrib',
    aiEnabled: true,
    salatResetDate: '2026-09-01',
    salatResetHistory: [
      { date: '2026-09-01', note: 'After travel', resetAt: new Date('2026-09-01T10:00:00Z') },
    ],
    totalCount: 1133,
    zikrTotals: { SubhanAllah: 1100, Alhamdulillah: 33 },
    zikrTypes: [{ name: 'My dua', createdAt: new Date('2026-08-01T00:00:00Z') }],
    prefs: {
      bustandeen_calc_method: { v: 'Karachi', t: 1000 },
      bustandeen_asr_madhab: { v: 'hanafi', t: 1000 },
      bustandeen_home_goals: { v: '{"on":true,"off":[],"badges":true}', t: 1000 },
      not_a_synced_key: { v: 'x', t: 1000 },
    },
    groqApiKeyEnc: 'SECRET-CIPHERTEXT',
  });
  await ZikrGoal.create({ userId: uid, dailyTarget: 300, isActive: true });
  await ZikrStreak.create({
    userId: uid,
    currentStreak: 4,
    longestStreak: 9,
    lastCompletedDate: new Date('2026-10-08'),
  });
  await ZikrDaily.create([
    { userId: uid, date: new Date('2026-10-07'), zikrType: 'SubhanAllah', count: 1100 },
    { userId: uid, date: new Date('2026-10-08'), zikrType: 'Alhamdulillah', count: 33 },
  ]);
  await ZikrEvent.create([
    {
      userId: uid,
      zikrType: 'SubhanAllah',
      amount: 100,
      ts: new Date('2026-10-07T05:00:00Z'),
      startTs: new Date('2026-10-07T04:55:00Z'),
    },
    {
      userId: uid,
      zikrType: 'Alhamdulillah',
      amount: 33,
      ts: new Date('2026-10-08T05:00:00Z'),
      manual: true,
    },
  ]);
  await SalatLog.create({
    userId: uid,
    date: '2026-10-07',
    prayers: {
      fajr: { status: 'completed', location: 'mosque', tasbeeh: true },
      isha: { status: 'kaza' },
    },
    nafl: { completed: true, types: [], rakat: 4 },
  });
  await SalatDebt.create({
    userId: uid,
    owed: { fajr: 2, dhuhr: 0, asr: 1, maghrib: 0, isha: 0 },
    since: '2026-09-01',
    lastAccrualDate: '2026-10-08',
    skippedRestDays: [],
  });
  await SalatDebtEvent.create([
    { userId: uid, date: '2026-10-05', prayer: 'fajr', delta: 1 },
    { userId: uid, date: '2026-10-06', prayer: 'asr', delta: 1 },
  ]);
  await KazaUnit.create([
    { userId: uid, prayer: 'fajr', missedDate: '2026-10-05', status: 'owed' },
    {
      userId: uid,
      prayer: 'asr',
      missedDate: '2026-10-06',
      status: 'paid',
      paidAt: new Date('2026-10-07T12:00:00Z'),
    },
  ]);
  const fp = await FastingProfile.create({
    userId: uid,
    qadaOwed: 3,
    kaffarah: { active: false, targetDays: 60 },
    vows: [{ title: 'Shukr', targetDays: 3 }],
  });
  await FastingLog.create([
    {
      userId: uid,
      date: '2026-10-05',
      category: 'voluntary',
      voluntaryKind: 'mon_thu',
      status: 'completed',
    },
    {
      userId: uid,
      date: '2026-10-06',
      category: 'nadhr',
      vowId: String(fp.vows[0]._id),
      status: 'completed',
    },
  ]);
  await AdhkarDay.create({
    userId: uid,
    date: '2026-10-07',
    morningAt: new Date('2026-10-07T01:00:00Z'),
  });
  await QuranProfile.create({
    userId: uid,
    dailyGoalAyat: 20,
    currentAyah: 300,
    khatmCount: 2,
    surahCounts: { 36: 3 },
    bookmarks: [{ surah: 2, ayah: 255 }],
  });
  await QuranLog.create({ userId: uid, date: '2026-10-07', pages: 2, ayat: 15, durationSec: 600 });
  await QuranReadingSession.create({
    userId: uid,
    clientSessionId: 'sess-1',
    date: '2026-10-07',
    startedAt: new Date('2026-10-07T02:00:00Z'),
    endedAt: new Date('2026-10-07T02:10:00Z'),
    source: 'listen',
  });
  await HifzProfile.create({
    userId: uid,
    dailyNewTarget: 3,
    dailyRevisionTarget: 10,
    nextSurah: 78,
    nextAyah: 5,
  });
  await HifzEntry.create({
    userId: uid,
    surah: 78,
    ayah: 1,
    state: 'learning',
    dueDate: '2026-10-09',
  });
  await HifzLog.create({ userId: uid, date: '2026-10-07' });
  await NaseehPlan.create({
    userId: uid,
    weekStart: '2026-10-05',
    accepted: true,
    targets: [{ kind: 'zikr', dailyAmount: 100, daysTarget: 5 }],
  });
  await CycleProfile.create({
    userId: uid,
    madhab: 'hanafi',
    partnerSyncEnabled: true,
    partnerUid: B.uid,
    bodyStatsEncrypted: encryptJson({ heightCm: 160 }),
  });
  await CycleLog.create({ userId: uid, startDate: '2026-09-20', type: 'hayd' });
  await CycleDay.create([
    {
      userId: uid,
      date: '2026-09-21',
      enc: encryptJson({ flow: 'light', symptoms: ['cramps'], moods: [], garden: [] }),
    },
    { userId: uid, date: '2026-09-22', enc: null },
  ]);
  await SocialProfile.create({
    userId: uid,
    inviteCode: 'BKPA1',
    friends: [B.uid],
    visibility: 'streaks',
    secret: { salat: false, zikr: true, quran: false, fasting: false },
  });
  await FeedbackMessage.create({
    name: 'Backup A',
    email,
    message: 'salam',
    kind: 'feedback',
    userId: uid,
    adminNote: 'INTERNAL NOTE',
  });
  await Donation.create({
    donorName: 'Backup A',
    email,
    phone: '01712345678',
    paymentMethod: 'bkash',
    transactionId: 'BKPTX1',
    amount: 100,
    transactionDate: new Date('2026-09-03'),
    ipAddress: '203.0.113.9',
    emailMessageId: '<internal@bustandeen.com>',
  });
}

describe('Backup v3: export, wipe, import restores exactly', () => {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_backup_test' });
    await seedEverything(A.uid, A.email);
    await User.create({ ...B, displayName: 'Someone Else' });
    await ZikrDaily.create({
      userId: B.uid,
      date: new Date('2026-10-07'),
      zikrType: 'SubhanAllah',
      count: 987654,
    });
    await SalatLog.create({
      userId: B.uid,
      date: '2026-10-07',
      prayers: { fajr: { status: 'completed' } },
    });
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect().catch(() => {});
    if (mongo) await mongo.stop();
  });

  test('requires sign-in', async () => {
    expect((await request(app).get('/api/user/export')).status).toBe(401);
    expect((await request(app).post('/api/user/import').send({})).status).toBe(401);
  });

  test('the file holds every domain, settings included', async () => {
    const f = await exportA();
    expect(f.app).toBe('ihsan');
    expect(f.version).toBe(3);
    expect(f.profile.bio).toBe('Bismillah');
    expect(f.settings).toMatchObject({ dayStartMode: 'maghrib', hijriOffset: -1, aiEnabled: true });
    expect(f.settings.app.bustandeen_calc_method).toBe('Karachi');
    expect(f.settings.app.not_a_synced_key).toBeUndefined();
    expect(f.zikr.daily).toHaveLength(2);
    expect(f.zikr.events).toHaveLength(2);
    expect(f.zikr.streak.longestStreak).toBe(9);
    expect(f.salat.resetDate).toBe('2026-09-01');
    expect(f.salat.kaza.debt.owed.fajr).toBe(2);
    expect(f.salat.kaza.units).toHaveLength(2);
    expect(f.salat.kaza.events).toHaveLength(2);
    expect(f.adhkar.days).toHaveLength(1);
    expect(f.quran.sessions).toHaveLength(1);
    expect(f.hifz.entries).toHaveLength(1);
    expect(f.naseeh.plans).toHaveLength(1);
    expect(f.friends).toMatchObject({ visibility: 'streaks', secret: { zikr: true } });
    expect(f.records.friendCounts.friends).toBe(1);
    expect(f.records.messagesToUs).toHaveLength(1);
    expect(f.records.sadaqahSubmissions[0].transactionId).toBe('BKPTX1');
  });

  test('Rayhanah is readable for its owner, without the partner', async () => {
    const f = await exportA();
    expect(f.rayhanah.days[0].note).toEqual({
      flow: 'light',
      symptoms: ['cramps'],
      moods: [],
      garden: [],
    });
    expect(f.rayhanah.days[1].note).toBeNull();
    expect(f.rayhanah.days[0].enc).toBeUndefined();
    expect(f.rayhanah.profile.bodyStats).toEqual({ heightCm: 160 });
    expect(f.rayhanah.profile.partnerUid).toBeUndefined();
    expect(f.rayhanah.profile.partnerSyncEnabled).toBeUndefined();
  });

  test('never leaks secrets, internal notes or other people', async () => {
    const raw = JSON.stringify(await exportA());
    for (const s of [
      'SECRET-CIPHERTEXT',
      'INTERNAL NOTE',
      '203.0.113.9',
      'internal@bustandeen.com',
      'Someone Else',
      B.uid,
      '987654',
    ]) {
      expect(raw).not.toContain(s);
    }
  });

  test('round trip: wipe the account, import, and the next export is identical', async () => {
    const before = await exportA();
    const bSalatBefore = await SalatLog.findOne({ userId: B.uid }).lean();

    await purgeAccountData(A.uid);
    expect(await ZikrDaily.countDocuments({ userId: A.uid })).toBe(0);
    expect(await KazaUnit.countDocuments({ userId: A.uid })).toBe(0);
    await request(app).post('/api/auth/verify').send({ idToken: tokenA });

    const imp = await asA(request(app).post('/api/user/import')).send(before);
    expect(imp.status).toBe(200);
    expect(imp.body.counts).toMatchObject({
      zikrDays: 2,
      salatDays: 1,
      fastingDays: 2,
      quranDays: 1,
      cycleEntries: 3,
      kazaUnits: 2,
    });

    const after = await exportA();
    expect(restorable(after)).toEqual(restorable(before));

    // The vow id survives, so the nadhr fast still points at its vow.
    expect(after.fasting.logs[1].vowId).toBe(String(after.fasting.profile.vows[0]._id));
    // Rayhanah is encrypted again at rest.
    const day = await CycleDay.findOne({ userId: A.uid, date: '2026-09-21' }).lean();
    expect(day.enc).not.toContain('cramps');
    expect(decryptJson(day.enc)).toMatchObject({ flow: 'light' });
    // Partner sharing is never switched on by a file.
    const cp = await CycleProfile.findOne({ userId: A.uid }).lean();
    expect(cp.partnerSyncEnabled).toBe(false);
    expect(cp.partnerUid).toBeUndefined();
    // Friends: privacy choices come back, the friend list does not.
    const sp = await SocialProfile.findOne({ userId: A.uid }).lean();
    expect(sp.friends).toEqual([]);
    expect(sp.visibility).toBe('streaks');
    // Other users are untouched.
    expect(await SalatLog.findOne({ userId: B.uid }).lean()).toEqual(bSalatBefore);
    expect(await ZikrDaily.countDocuments({ userId: B.uid })).toBe(1);
  });

  test('importing twice changes nothing (no double counts)', async () => {
    const before = await exportA();
    await asA(request(app).post('/api/user/import')).send(before);
    const after = await exportA();
    expect(restorable(after)).toEqual(restorable(before));
    expect(await ZikrEvent.countDocuments({ userId: A.uid })).toBe(2);
    expect(await SalatDebtEvent.countDocuments({ userId: A.uid })).toBe(2);
  });

  test('merge: a day not in the file stays, a day in the file wins', async () => {
    const file = await exportA();
    await ZikrDaily.create({
      userId: A.uid,
      date: new Date('2026-10-09'),
      zikrType: 'SubhanAllah',
      count: 7,
    });
    await ZikrDaily.updateOne(
      { userId: A.uid, date: new Date('2026-10-07') },
      { $set: { count: 1 } }
    );
    await asA(request(app).post('/api/user/import')).send(file);
    expect((await ZikrDaily.findOne({ userId: A.uid, date: new Date('2026-10-09') })).count).toBe(
      7
    );
    expect((await ZikrDaily.findOne({ userId: A.uid, date: new Date('2026-10-07') })).count).toBe(
      1100
    );
  });

  test('restored settings are stamped new so they win on every device', async () => {
    const before = Date.now();
    const user = await User.findOne({ uid: A.uid }).select('+prefs').lean();
    expect(user.prefs.bustandeen_calc_method.v).toBe('Karachi');
    expect(user.prefs.bustandeen_calc_method.t).toBeGreaterThan(before - 60_000);
    expect(user.prefs.not_a_synced_key).toBeUndefined();
  });

  test('a gzipped upload is accepted', async () => {
    const file = await exportA();
    const res = await asA(request(app).post('/api/user/import'))
      .set('Content-Type', 'application/json')
      .set('Content-Encoding', 'gzip')
      .serialize((b) => b)
      .send(gzipSync(Buffer.from(JSON.stringify(file))));
    expect(res.status).toBe(200);
    expect(res.body.counts.zikrDays).toBe(3);
  });

  test('bad docs are skipped, unknown fields dropped, never written raw', async () => {
    const file = await exportA();
    file.salat.logs = [
      { date: '2026-10-01', prayers: { fajr: { status: 'not-a-status' } } },
      { date: '2026-10-02', prayers: { fajr: { status: 'completed' } }, evil: { $where: 'x' } },
    ];
    file.zikr.daily = [{ date: '2026-10-01', zikrType: '$bad', count: 5 }];
    const res = await asA(request(app).post('/api/user/import')).send(file);
    expect(res.status).toBe(200);
    expect(res.body.counts.salatDays).toBe(1);
    expect(res.body.counts.zikrDays).toBe(0);
    const log = await SalatLog.findOne({ userId: A.uid, date: '2026-10-02' }).lean();
    expect(log.evil).toBeUndefined();
    expect(await SalatLog.findOne({ userId: A.uid, date: '2026-10-01' })).toBeNull();
  });

  test('version-2 files still restore', async () => {
    const v2 = {
      app: 'ihsan',
      version: 2,
      zikr: { daily: [{ date: '2026-08-01T00:00:00.000Z', zikrType: 'Takbir', count: 34 }] },
      salat: [{ date: '2026-08-01', prayers: { fajr: { status: 'completed' } } }],
      cycle: { profile: { madhab: 'majority', partnerUid: 'someone', partnerSyncEnabled: true } },
    };
    const res = await asA(request(app).post('/api/user/import')).send(v2);
    expect(res.status).toBe(200);
    expect(res.body.counts.zikrDays).toBe(1);
    expect(res.body.counts.salatDays).toBe(1);
    const cp = await CycleProfile.findOne({ userId: A.uid }).lean();
    expect(cp.partnerUid).toBeUndefined();
    expect(cp.partnerSyncEnabled).toBe(false);
  });

  test('other files are rejected', async () => {
    for (const body of [
      { hello: 'world' },
      { app: 'ihsan', version: 1 },
      { app: 'bustandeen', version: 3 },
    ]) {
      const res = await asA(request(app).post('/api/user/import')).send(body);
      expect(res.status).toBe(400);
    }
  });

  test('the old "All my data" route returns the same file', async () => {
    const res = await asA(request(app).get('/api/user/export/all'));
    expect(res.status).toBe(200);
    expect(res.body.data.version).toBe(3);
    expect(res.body.data.kind).toBe('bustandeen-backup');
  });
});
