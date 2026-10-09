import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { MongoMemoryServer } from 'mongodb-memory-server';
import QuranLog from '../src/models/QuranLog.js';
import SalatLog from '../src/models/SalatLog.js';
import ZikrDaily from '../src/models/ZikrDaily.js';
import {
  migrateSocialVisibility,
  revertSocialVisibility,
} from '../src/scripts/lib/socialVisibilityMigration.js';

// T3.6 (FIQH-03): friends privacy levels, secret deeds, and the migration
// that keeps every pre-T3.6 user's visibility exactly as it was.

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

const TZ = 360;
const TODAY = new Date(Date.now() + TZ * 60 * 1000).toISOString().slice(0, 10);

const tok = (uid) => fakeJwt({ uid, email: `${uid}@test.dev`, name: uid });
const as = (uid) => (r) => r.set('Authorization', `Bearer ${tok(uid)}`);
const summary = (uid) =>
  as(uid)(request(app).get(`/api/social/summary?today=${TODAY}&timezoneOffset=${TZ}`));
const rowOf = (res, uid) => res.body.circle.find((r) => r.uid === uid);

const DETAIL_ONLY = [
  'salatToday',
  'prayersDue',
  'zikrToday',
  'zikrGoal',
  'zikrGoalMet',
  'fastsThisMonth',
  'fastedToday',
  'quranPagesToday',
  'quranGoal',
  'score',
  'weekScore',
  'week',
  'usualScore',
  'actsToday',
];

let mongo;
let col;

/** A profile exactly as stored before T3.6: no visibility, no secret. */
async function insertLegacyProfile(userId, friends, invisible) {
  const since = Object.fromEntries(friends.map((f) => [f, new Date('2026-05-01T00:00:00Z')]));
  await col.insertOne({
    userId,
    inviteCode: `code-${userId}`,
    friends,
    friendSince: since,
    pendingIncoming: [],
    pendingOutgoing: [],
    blocked: [],
    invisible,
    createdAt: new Date('2026-05-01T00:00:00Z'),
    updatedAt: new Date('2026-05-01T00:00:00Z'),
  });
}

/** Everything about a profile except the privacy fields this task adds. */
async function relationshipSnapshot() {
  const docs = await col.find({}).sort({ userId: 1 }).toArray();
  return docs.map(
    ({ _id, visibility, visibilitySource, secret, invisible, updatedAt, ...rest }) => rest
  );
}

async function worshipSnapshot() {
  const strip = (d) => {
    const o = d.toObject();
    delete o._id;
    delete o.__v;
    delete o.updatedAt;
    return o;
  };
  const [q, s, z] = await Promise.all([
    QuranLog.find({}).sort({ userId: 1, date: 1 }),
    SalatLog.find({}).sort({ userId: 1, date: 1 }),
    ZikrDaily.find({}).sort({ userId: 1, date: 1, zikrType: 1 }),
  ]);
  return JSON.stringify({ q: q.map(strip), s: s.map(strip), z: z.map(strip) });
}

describe('Friends privacy (T3.6)', () => {
  beforeAll(async () => {
    process.env.DEV_AUTH_BYPASS = '1';
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test' });
    col = mongoose.connection.collection('socialprofiles');

    for (const uid of ['viewer', 'oldOpen', 'oldHidden', 'newbie']) {
      await request(app)
        .post('/api/auth/verify')
        .send({ idToken: tok(uid) });
    }
    // Pre-T3.6 circle: viewer is friends with oldOpen and oldHidden
    await insertLegacyProfile('viewer', ['oldOpen', 'oldHidden'], false);
    await insertLegacyProfile('oldOpen', ['viewer'], false);
    await insertLegacyProfile('oldHidden', ['viewer'], true);

    // oldOpen's worship today: 2 prayers, zikr goal met, 25 ayat
    await as('oldOpen')(request(app).patch('/api/salat/prayer')).send({
      prayer: 'fajr',
      status: 'completed',
      date: TODAY,
    });
    await as('oldOpen')(request(app).patch('/api/salat/prayer')).send({
      prayer: 'dhuhr',
      status: 'completed',
      date: TODAY,
    });
    await as('oldOpen')(request(app).post('/api/zikr/increment/batch')).send({
      increments: [{ zikrType: 'SubhanAllah', amount: 120 }],
      timezoneOffset: TZ,
      today: TODAY,
    });
    await QuranLog.create({ userId: 'oldOpen', date: TODAY, ayat: 25, pages: 0 });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
    if (mongo) await mongo.stop();
  });

  test('an unmigrated pre-T3.6 profile keeps exactly what friends saw before', async () => {
    const res = await summary('viewer');
    expect(res.status).toBe(200);
    // oldHidden (invisible: true) is still hidden from existing friends
    expect(res.body.circle.map((r) => r.uid)).toEqual(['viewer', 'oldOpen']);
    // oldOpen (invisible: false) still shares full detail
    const open = rowOf(res, 'oldOpen');
    expect(open.visibility).toBe('detail');
    expect(open.salatToday).toBe(2);
    expect(open.zikrToday).toBe(120);
    expect(open.quranPagesToday).toBe(25);
    expect(open.score).toBeGreaterThan(0);
    // The viewer's own setting reads as it was too
    expect(res.body.privacy).toEqual({
      visibility: 'detail',
      secret: { salat: false, zikr: false, quran: false, fasting: false },
    });
    expect(res.body.invisible).toBe(false);
  });

  test('migration: dry run writes nothing; apply keeps visibility and relationships', async () => {
    const before = await relationshipSnapshot();
    const worshipBefore = await worshipSnapshot();
    const viewBefore = rowOf(await summary('viewer'), 'oldOpen');
    const ownNoorBefore = (
      await as('oldOpen')(request(app).get(`/api/social/noor?today=${TODAY}&timezoneOffset=${TZ}`))
    ).body;

    const dry = await migrateSocialVisibility(col, { apply: false });
    expect(dry).toEqual({ toHidden: 1, toDetail: 2, reverted: 0 });
    expect(await col.countDocuments({ visibility: { $exists: true } })).toBe(0);

    const applied = await migrateSocialVisibility(col, { apply: true });
    expect(applied).toEqual({ toHidden: 1, toDetail: 2, reverted: 0 });
    const byUser = Object.fromEntries(
      (await col.find({}).toArray()).map((d) => [d.userId, d.visibility])
    );
    expect(byUser).toEqual({ viewer: 'detail', oldOpen: 'detail', oldHidden: 'hidden' });

    // Idempotent: a second run finds nothing to do
    expect(await migrateSocialVisibility(col, { apply: true })).toEqual({
      toHidden: 0,
      toDetail: 0,
      reverted: 0,
    });

    // Friends, dates, invite codes, requests, blocks and worship logs untouched
    expect(await relationshipSnapshot()).toEqual(before);
    expect(await worshipSnapshot()).toBe(worshipBefore);
    // What the viewer sees and oldOpen's own Noor are unchanged
    const viewAfter = rowOf(await summary('viewer'), 'oldOpen');
    expect(viewAfter).toEqual(viewBefore);
    const ownNoorAfter = (
      await as('oldOpen')(request(app).get(`/api/social/noor?today=${TODAY}&timezoneOffset=${TZ}`))
    ).body;
    expect(ownNoorAfter).toEqual(ownNoorBefore);
  });

  test('revert undoes only migrated values, never a choice made since', async () => {
    // viewer makes a choice after the migration
    const set = await as('viewer')(request(app).patch('/api/social/privacy')).send({
      visibility: 'streaks',
    });
    expect(set.status).toBe(200);

    expect(await revertSocialVisibility(col, { apply: false })).toEqual({
      toHidden: 0,
      toDetail: 0,
      reverted: 2,
    });
    await revertSocialVisibility(col, { apply: true });
    const docs = Object.fromEntries((await col.find({}).toArray()).map((d) => [d.userId, d]));
    expect(docs.viewer.visibility).toBe('streaks');
    expect(docs.oldOpen.visibility).toBeUndefined();
    expect(docs.oldHidden.visibility).toBeUndefined();
    // Reverted profiles still read as before (legacy invisible flag)
    const res = await summary('viewer');
    expect(res.body.circle.map((r) => r.uid)).toEqual(['viewer', 'oldOpen']);
    expect(rowOf(res, 'oldOpen').visibility).toBe('detail');

    // Re-apply for the rest of the suite; the viewer's own choice is kept
    await migrateSocialVisibility(col, { apply: true });
    expect((await col.findOne({ userId: 'viewer' })).visibility).toBe('streaks');
    await as('viewer')(request(app).patch('/api/social/privacy')).send({ visibility: 'detail' });
  });

  test('a new user starts at consistency only; friends get no daily numbers', async () => {
    const own = await summary('newbie');
    expect(own.body.privacy.visibility).toBe('streaks');
    const code = own.body.inviteCode;

    await as('viewer')(request(app).post('/api/social/connect')).send({ code });
    await as('newbie')(request(app).post('/api/social/requests/viewer/accept'));
    await as('newbie')(request(app).post('/api/zikr/increment/batch')).send({
      increments: [{ zikrType: 'SubhanAllah', amount: 150 }],
      timezoneOffset: TZ,
      today: TODAY,
    });

    const row = rowOf(await summary('viewer'), 'newbie');
    expect(row.visibility).toBe('streaks');
    expect(typeof row.zikrStreak).toBe('number');
    expect(typeof row.quranStreak).toBe('number');
    expect(row.activeDays).toBe(1);
    expect(row.weekDays).toBeGreaterThanOrEqual(1);
    for (const key of DETAIL_ONLY) expect(row).not.toHaveProperty(key);

    // The newbie still sees all of their own row
    const mine = rowOf(await summary('newbie'), 'newbie');
    expect(mine.visibility).toBe('detail');
    expect(mine.zikrToday).toBe(150);
    expect(mine.score).toBeGreaterThan(0);
  });

  test('the circle is ordered me first, then longest streak, never by Noor', async () => {
    const res = await summary('viewer');
    expect(res.body.circle[0].uid).toBe('viewer');
    const others = res.body.circle.slice(1);
    const longest = (r) => Math.max(r.zikrStreak ?? 0, r.quranStreak ?? 0);
    for (let i = 1; i < others.length; i++) {
      expect(longest(others[i - 1])).toBeGreaterThanOrEqual(longest(others[i]));
    }
  });

  test('secret deeds: the area disappears for friends and leaves the Noor they see', async () => {
    const before = rowOf(await summary('viewer'), 'oldOpen');
    expect(before.quranPagesToday).toBe(25);

    const set = await as('oldOpen')(request(app).patch('/api/social/privacy')).send({
      secret: { quran: true, salat: true },
    });
    expect(set.body.privacy).toEqual({
      visibility: 'detail',
      secret: { salat: true, zikr: false, quran: true, fasting: false },
    });

    const after = rowOf(await summary('viewer'), 'oldOpen');
    for (const key of ['quranPagesToday', 'quranGoal', 'quranStreak', 'salatToday', 'prayersDue']) {
      expect(after).not.toHaveProperty(key);
    }
    expect(after.week).not.toHaveProperty('quran');
    expect(after.week).not.toHaveProperty('salat');
    expect(after.zikrToday).toBe(120); // zikr is not secret
    // 2 prayers (20) + Quran goal (15) are gone from the score friends see
    expect(after.score).toBe(before.score - 35);

    // ...but not from oldOpen's own Noor or own row
    const own = rowOf(await summary('oldOpen'), 'oldOpen');
    expect(own.quranPagesToday).toBe(25);
    expect(own.salatToday).toBe(2);
    expect(own.score).toBe(before.score);
    const noor = await as('oldOpen')(
      request(app).get(`/api/social/noor?today=${TODAY}&timezoneOffset=${TZ}`)
    );
    expect(noor.body.today).toBe(before.score);

    // Secret areas are also left out at consistency-only level
    await as('oldOpen')(request(app).patch('/api/social/privacy')).send({
      visibility: 'streaks',
    });
    const streakRow = rowOf(await summary('viewer'), 'oldOpen');
    expect(streakRow).not.toHaveProperty('quranStreak');
    expect(streakRow).toHaveProperty('zikrStreak');

    await as('oldOpen')(request(app).patch('/api/social/privacy')).send({
      visibility: 'detail',
      secret: { quran: false, salat: false },
    });
  });

  test('hidden hides from everyone; the old /invisible route still works as an alias', async () => {
    await as('oldOpen')(request(app).patch('/api/social/privacy')).send({ visibility: 'hidden' });
    expect(rowOf(await summary('viewer'), 'oldOpen')).toBeUndefined();
    expect((await col.findOne({ userId: 'oldOpen' })).invisible).toBe(true);

    const off = await as('oldOpen')(request(app).patch('/api/social/invisible')).send({
      invisible: false,
    });
    expect(off.body).toEqual({ ok: true, invisible: false });
    const doc = await col.findOne({ userId: 'oldOpen' });
    expect(doc.visibility).toBe('detail');
    expect(doc.invisible).toBe(false);
    expect(rowOf(await summary('viewer'), 'oldOpen').visibility).toBe('detail');
  });

  test('privacy body is validated', async () => {
    const empty = await as('viewer')(request(app).patch('/api/social/privacy')).send({});
    expect(empty.status).toBe(400);
    const bad = await as('viewer')(request(app).patch('/api/social/privacy')).send({
      visibility: 'public',
    });
    expect(bad.status).toBe(400);
    const extra = await as('viewer')(request(app).patch('/api/social/privacy')).send({
      secret: { tahajjud: true },
    });
    expect(extra.status).toBe(400);
  });
});
