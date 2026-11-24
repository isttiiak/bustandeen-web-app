import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import User from '../src/models/User.js';
import HifzEntry from '../src/models/HifzEntry.js';
import HifzLog from '../src/models/HifzLog.js';
import HifzProfile from '../src/models/HifzProfile.js';
import * as hifz from '../src/services/hifz.service.js';
import { SURAH_AYAH_COUNTS } from '../src/utils/surahAyahCounts.js';

// Hifz bug fixes (2026-11-25): a date the server cannot believe, an ayah number that does not
// exist, two taps at once, "add next" that adds nothing, and a restore that keeps impossible ayat.

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

let mongo;
beforeAll(async () => {
  process.env.DEV_AUTH_BYPASS = '1';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_hifz' });
  await Promise.all([HifzEntry.init(), HifzLog.init(), HifzProfile.init()]);
});
afterAll(async () => {
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect().catch(() => {});
  if (mongo) await mongo.stop();
});

let n = 0;
async function newUser() {
  const uid = `hz${++n}`;
  await User.create({ uid, email: `${uid}@test.dev` });
  const token = fakeJwt({ uid, email: `${uid}@test.dev` });
  return { uid, as: (r) => r.set('Authorization', `Bearer ${token}`) };
}
const utcDay = (offset = 0) =>
  new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
const TODAY = utcDay();

describe('the day the app sends', () => {
  test('a day nobody can be living in is refused, today is accepted', async () => {
    const u = await newUser();
    for (const path of ['/api/hifz/entries', '/api/hifz/next']) {
      const far = await u
        .as(request(app).post(path))
        .send({ surah: 1, ayah: 1, date: '2099-01-01' });
      expect(far.status).toBe(400);
      const old = await u
        .as(request(app).post(path))
        .send({ surah: 1, ayah: 1, date: '2001-01-01' });
      expect(old.status).toBe(400);
    }
    expect(await HifzEntry.countDocuments({ userId: u.uid })).toBe(0);
    const ok = await u
      .as(request(app).post('/api/hifz/entries'))
      .send({ surah: 1, ayah: 1, date: TODAY });
    expect(ok.status).toBe(200);
  });

  test('a review on a forged day is refused too', async () => {
    const u = await newUser();
    await u.as(request(app).post('/api/hifz/entries')).send({ surah: 1, ayah: 1, date: TODAY });
    const res = await u
      .as(request(app).post('/api/hifz/review'))
      .send({ surah: 1, ayah: 1, result: 'easy', date: '2099-01-01' });
    expect(res.status).toBe(400);
  });
});

describe('ayah numbers that exist', () => {
  test('al-Fatiha has 7 ayat: 1:7 is fine, 1:8 and 2:287 are refused everywhere', async () => {
    const u = await newUser();
    const add = (b) => u.as(request(app).post('/api/hifz/entries')).send(b);
    expect((await add({ surah: 1, ayah: 7 })).status).toBe(200);
    expect((await add({ surah: 1, ayah: 8 })).status).toBe(400);
    expect((await add({ surah: 112, ayah: 5 })).status).toBe(400);
    expect(
      (
        await u
          .as(request(app).post('/api/hifz/review'))
          .send({ surah: 1, ayah: 8, result: 'easy' })
      ).status
    ).toBe(400);
    expect(
      (await u.as(request(app).delete('/api/hifz/entries')).send({ surah: 1, ayah: 8 })).status
    ).toBe(400);
    expect(await HifzEntry.countDocuments({ userId: u.uid })).toBe(1);
  });
});

describe('two taps at once', () => {
  test('adding the same ayah five times at once gives one entry, one count, and no error', async () => {
    const u = await newUser();
    const results = await Promise.all(
      Array.from({ length: 5 }, () => hifz.addEntry(u.uid, 2, 255, TODAY))
    );
    expect(results.filter((r) => !r.alreadyExists)).toHaveLength(1);
    expect(await HifzEntry.countDocuments({ userId: u.uid })).toBe(1);
    expect((await HifzLog.findOne({ userId: u.uid, date: TODAY })).newCount).toBe(1);
  });
});

describe('"add next" always adds something new', () => {
  test('it skips ayat that are already in the list', async () => {
    const u = await newUser();
    await hifz.addEntry(u.uid, 1, 1, TODAY);
    await hifz.addEntry(u.uid, 1, 2, TODAY);
    const res = await u.as(request(app).post('/api/hifz/next')).send({ date: TODAY });
    expect(res.status).toBe(200);
    expect(res.body.alreadyExists).toBe(false);
    expect(res.body.entry).toMatchObject({ surah: 1, ayah: 3 });
    const profile = await HifzProfile.findOne({ userId: u.uid });
    expect([profile.nextSurah, profile.nextAyah]).toEqual([1, 4]);
  });

  test('when every ayah is already in the list it says so and adds nothing', async () => {
    const u = await newUser();
    const docs = [];
    for (let s = 1; s <= 114; s += 1) {
      for (let a = 1; a <= SURAH_AYAH_COUNTS[s]; a += 1) {
        docs.push({ userId: u.uid, surah: s, ayah: a, dueDate: TODAY, state: 'new' });
      }
    }
    await HifzEntry.insertMany(docs);
    const out = await hifz.addNext(u.uid, TODAY);
    expect(out.cursorExhausted).toBe(true);
    expect(out.alreadyExists).toBe(true);
    expect(await HifzEntry.countDocuments({ userId: u.uid })).toBe(6236);
  });
});

describe('restoring a backup', () => {
  test('keeps real ayat, leaves out impossible ones and ones with a broken due date', async () => {
    const u = await newUser();
    const file = {
      app: 'ihsan',
      version: 3,
      hifz: {
        entries: [
          {
            surah: 1,
            ayah: 2,
            dueDate: TODAY,
            state: 'learning',
            interval: 1,
            reps: 1,
            easeFactor: 2.5,
            lapses: 0,
          },
          { surah: 1, ayah: 99, dueDate: TODAY, state: 'new' },
          { surah: 2, ayah: 5, dueDate: 'not-a-date', state: 'new' },
        ],
      },
    };
    const res = await u.as(request(app).post('/api/user/import')).send(file);
    expect(res.status).toBe(200);
    const kept = await HifzEntry.find({ userId: u.uid }).lean();
    expect(kept.map((e) => `${e.surah}:${e.ayah}`)).toEqual(['1:2']);
  });
});
