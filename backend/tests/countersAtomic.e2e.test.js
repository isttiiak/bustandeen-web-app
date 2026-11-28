import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { setClientDayBoundForTests } from '../src/validation/clientDay.js';
import User from '../src/models/User.js';
import QuranProfile from '../src/models/QuranProfile.js';
import QuranLog from '../src/models/QuranLog.js';
import SocialProfile, { MAX_FRIENDS } from '../src/models/SocialProfile.js';
import ZikrDaily from '../src/models/ZikrDaily.js';
import Donation from '../src/models/Donation.js';
import DonationStats from '../src/models/DonationStats.js';
import * as social from '../src/services/social.service.js';
import * as zikr from '../src/services/zikr.service.js';
import * as sadaqah from '../src/services/sadaqah.service.js';

// Audit 2026-11-16 P1-9: counters kept as "read, change, save" across several
// documents. Each area below is probed with requests that overlap, or with a
// failure part-way, and must end consistent.

setClientDayBoundForTests(false);

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

let mongo;
beforeAll(async () => {
  process.env.DEV_AUTH_BYPASS = '1';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_counters' });
  await Promise.all([
    QuranProfile.init(),
    QuranLog.init(),
    SocialProfile.init(),
    ZikrDaily.init(),
    Donation.init(),
    DonationStats.init(),
  ]);
});
afterAll(async () => {
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect().catch(() => {});
  if (mongo) await mongo.stop();
});
afterEach(() => jest.restoreAllMocks());

let n = 0;
const uid = (p) => `${p}${++n}`;

describe('Quran profile', () => {
  test('eight read-ayat requests at once all land in the profile and the day', async () => {
    const u = uid('qp');
    await User.create({ uid: u, email: `${u}@test.dev` });
    const token = fakeJwt({ uid: u, email: `${u}@test.dev` });
    const res = await Promise.all(
      Array.from({ length: 8 }, () =>
        request(app)
          .post('/api/quran/read-ayat')
          .set('Authorization', `Bearer ${token}`)
          .set('X-Client-Op-Id', randomUUID())
          .send({
            date: '2026-03-01',
            count: 10,
            surah: 1,
            advanceKhatm: true,
            completedSurah: true,
          })
      )
    );
    expect(res.map((r) => r.status)).toEqual(Array(8).fill(200));
    // Completions sent from the khatam route never count toward top surahs...
    expect((await QuranProfile.findOne({ userId: u })).surahCounts.get('1')).toBeUndefined();
    // ...while eight at once from anywhere else all land.
    const free = await Promise.all(
      Array.from({ length: 8 }, () =>
        request(app)
          .post('/api/quran/read-ayat')
          .set('Authorization', `Bearer ${token}`)
          .set('X-Client-Op-Id', randomUUID())
          .send({ date: '2026-03-01', count: 0, surah: 1, completedSurah: true })
      )
    );
    expect(free.map((r) => r.status)).toEqual(Array(8).fill(200));
    const profile = await QuranProfile.findOne({ userId: u });
    expect(profile.currentAyah).toBe(80);
    expect(profile.surahCounts.get('1')).toBe(8);
    expect((await QuranLog.findOne({ userId: u, date: '2026-03-01' })).ayat).toBe(80);
  });
});

describe('friends', () => {
  async function profileWith(userId, friends = [], pendingIncoming = [], pendingOutgoing = []) {
    await SocialProfile.create({
      userId,
      inviteCode: `code-${userId}`,
      friends,
      pendingIncoming,
      pendingOutgoing,
    });
  }

  test('two people accepted at once cannot take the 50th place twice', async () => {
    const me = uid('fr');
    const [r1, r2] = [uid('rq'), uid('rq')];
    const existing = Array.from({ length: MAX_FRIENDS - 1 }, (_, i) => `${me}-f${i}`);
    await profileWith(me, existing, [r1, r2]);
    await profileWith(r1, [], [], [me]);
    await profileWith(r2, [], [], [me]);
    const results = await Promise.all([social.acceptRequest(me, r1), social.acceptRequest(me, r2)]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    const mine = await SocialProfile.findOne({ userId: me });
    expect(mine.friends.length).toBe(MAX_FRIENDS);
    // the accepted side and my side agree
    const accepted = results[0].ok ? r1 : r2;
    expect((await SocialProfile.findOne({ userId: accepted })).friends).toContain(me);
    const refused = results[0].ok ? r2 : r1;
    expect((await SocialProfile.findOne({ userId: refused })).friends).not.toContain(me);
    expect(mine.pendingIncoming).toContain(refused); // still waiting, not lost
  });

  test('a failure on the second side leaves neither side changed', async () => {
    const me = uid('fr');
    const other = uid('rq');
    await profileWith(me, [], [other]);
    await profileWith(other, [], [], [me]);
    const real = SocialProfile.updateOne.bind(SocialProfile);
    let calls = 0;
    jest.spyOn(SocialProfile, 'updateOne').mockImplementation((...a) => {
      if (++calls === 2) return Promise.reject(new Error('boom'));
      return real(...a);
    });
    await expect(social.acceptRequest(me, other)).rejects.toThrow('boom');
    jest.restoreAllMocks();
    expect((await SocialProfile.findOne({ userId: me })).friends).toEqual([]);
    expect((await SocialProfile.findOne({ userId: me })).pendingIncoming).toEqual([other]);
    expect((await SocialProfile.findOne({ userId: other })).friends).toEqual([]);
  });
});

describe('zikr rename', () => {
  test('a failure while moving the daily buckets leaves the name, the total and the buckets as they were', async () => {
    const u = uid('zr');
    await User.create({
      uid: u,
      email: `${u}@test.dev`,
      zikrTypes: [{ name: 'Old' }],
      zikrTotals: { Old: 40 },
    });
    await ZikrDaily.create({ userId: u, date: new Date('2026-03-01'), zikrType: 'Old', count: 40 });
    jest.spyOn(ZikrDaily, 'bulkWrite').mockRejectedValueOnce(new Error('boom'));
    await expect(zikr.renameZikrType(u, 'Old', 'New')).rejects.toThrow('boom');
    const user = await User.findOne({ uid: u });
    expect(user.zikrTypes.map((t) => t.name)).toEqual(['Old']);
    expect(user.zikrTotals.get('Old')).toBe(40);
    expect(user.zikrTotals.get('New')).toBeUndefined();
    expect(await ZikrDaily.countDocuments({ userId: u, zikrType: 'Old' })).toBe(1);
  });
});

describe('sadaqah stats', () => {
  const donation = (amount) =>
    Donation.create({
      userId: null,
      email: 'donor@test.dev',
      name: 'Donor',
      amount,
      paymentMethod: 'bkash',
      phone: '01700000000',
      transactionId: `t-${randomUUID()}`,
      transactionDate: new Date('2026-03-05'),
      status: 'pending',
    });
  const stats = async () => await DonationStats.findOne({ _id: 'current' });

  test('a failure while adding to the public total leaves the donation pending', async () => {
    const d = await donation(500);
    jest.spyOn(DonationStats, 'updateOne').mockRejectedValueOnce(new Error('boom'));
    await expect(sadaqah.verifyDonation(String(d._id), 'admin@test.dev', 'thanks')).rejects.toThrow(
      'boom'
    );
    expect((await Donation.findById(d._id)).status).toBe('pending');
  });

  test('two quarters published at once are both kept', async () => {
    await donation(100);
    await Promise.all([
      sadaqah.publishQuarterly('2026-Q1', 'a'),
      sadaqah.publishQuarterly('2026-Q2', 'b'),
      sadaqah.publishQuarterly('2026-Q3', 'c'),
    ]);
    const s = await stats();
    expect(s.quarterlyBreakdown.map((q) => q.quarter).sort()).toEqual([
      '2026-Q1',
      '2026-Q2',
      '2026-Q3',
    ]);
  });
});

describe('read-only check of the cached sadaqah totals', () => {
  test('reports a difference between the cache and the verified donations, and writes nothing', async () => {
    const { reportDonationStatsDrift } = await import('../src/scripts/lib/donationStatsDrift.js');
    await DonationStats.updateOne(
      { _id: 'current' },
      { $set: { totalVerifiedAmount: 0, totalVerifiedCount: 0 } },
      { upsert: true }
    );
    await Donation.deleteMany({});
    const d = await Donation.create({
      email: 'donor@test.dev',
      name: 'Donor',
      amount: 300,
      paymentMethod: 'bkash',
      phone: '01700000000',
      transactionId: `t-${randomUUID()}`,
      transactionDate: new Date('2026-03-05'),
      status: 'verified',
    });
    const before = await DonationStats.findOne({ _id: 'current' }).lean();
    const report = await reportDonationStatsDrift();
    expect(report.inSync).toBe(false);
    expect(report.difference).toEqual({ amount: 300, count: 1 });
    expect(await DonationStats.findOne({ _id: 'current' }).lean()).toEqual(before);
    await Donation.deleteOne({ _id: d._id });
  });
});
