import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as naseeh from '../src/services/naseehInsights.service.js';
import * as salatService from '../src/services/salat.service.js';
import User from '../src/models/User.js';

// Naseeh page features computed from the user's own data. What matters here:
//   - numbers in every answer come from the database, not the model
//   - the model can only pick a whitelisted lookup or re-word a sentence, and
//     a re-word that changes a number is thrown away
//   - "Naseeh off" blocks the model path

const UID = 'naseeh-insights-1';
const OFF_UID = 'naseeh-insights-off';
const iso = (offset) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};
const TODAY = iso(0);

function mockReply(content) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ choices: [{ message: { content } }] }),
  });
}

let mongo;
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_naseeh_insights' });
  await User.create({ uid: UID, email: 'ni@test.local', aiEnabled: true });
  await User.create({ uid: OFF_UID, email: 'ni-off@test.local', aiEnabled: false });
  // 9 past days: Fajr missed every day, the other four prayers completed.
  for (let back = 9; back >= 1; back--) {
    const date = iso(-back);
    await salatService.updatePrayerStatus(UID, 'fajr', 'missed', date);
    for (const p of ['dhuhr', 'asr', 'maghrib', 'isha']) {
      await salatService.updatePrayerStatus(UID, p, 'completed', date);
    }
  }
});
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect().catch(() => {});
  }
  if (mongo) await mongo.stop();
});

const ORIGINAL_FETCH = global.fetch;
beforeEach(() => {
  process.env.GROQ_API_KEY = 'test-key';
  mockReply('{}');
});
afterEach(() => {
  global.fetch = ORIGINAL_FETCH;
});

const opts = { today: TODAY, timezoneOffset: 0 };

describe('runDataQuery (no model involved)', () => {
  test('counts missed Fajr in the last 7 days from the log', async () => {
    const r = await naseeh.runDataQuery(
      UID,
      { query: 'salat_missed', period: 'week', prayer: 'fajr' },
      opts
    );
    expect(r.answered).toBe(true);
    expect(r.answer).toBe('You missed Fajr 6 times in the last 7 days.');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('prayed count and kaza owed reflect the seeded log', async () => {
    const prayed = await naseeh.runDataQuery(UID, { query: 'salat_prayed', period: 'week' }, opts);
    expect(prayed.answer).toMatch(/^You prayed 24 of 35 prayers in the last 7 days/);
    const kaza = await naseeh.runDataQuery(UID, { query: 'kaza_owed' }, opts);
    expect(kaza.answer).toMatch(/Fajr/);
  });

  test('a period before tracking started says how many days were counted', async () => {
    const r = await naseeh.runDataQuery(UID, { query: 'salat_missed', period: 'year' }, opts);
    expect(r.answer).toMatch(/based on \d+ counted days/);
  });
});

describe('askAboutData (model only picks the lookup)', () => {
  test('a valid pick is executed and answered from the database', async () => {
    mockReply(JSON.stringify({ query: 'salat_missed', period: 'week', prayer: 'fajr' }));
    const r = await naseeh.askAboutData(UID, 'how many fajr did I miss this week?', opts);
    expect(r.answered).toBe(true);
    expect(r.answer).toContain('6 times');
  });

  test('"none" and unknown lookup ids are refused, never executed', async () => {
    mockReply(JSON.stringify({ query: 'none' }));
    const none = await naseeh.askAboutData(UID, 'is missing fajr haram?', opts);
    expect(none.answered).toBe(false);
    expect(none.reason).toBe('unsupported');
    mockReply(JSON.stringify({ query: 'delete_everything', period: 'week' }));
    const bad = await naseeh.askAboutData(UID, 'wipe my data', opts);
    expect(bad.answered).toBe(false);
  });

  test('an unusable period falls back to week; an unusable prayer is dropped', async () => {
    mockReply(JSON.stringify({ query: 'salat_missed', period: 'decade', prayer: 'witr' }));
    const r = await naseeh.askAboutData(UID, 'missed prayers', opts);
    expect(r.query).toEqual({ query: 'salat_missed', period: 'week', prayer: undefined });
  });

  test('Naseeh turned off: no model call, friendly "unavailable" answer', async () => {
    const r = await naseeh.askAboutData(OFF_UID, 'how many fajr did I miss?', opts);
    expect(r.answered).toBe(false);
    expect(r.reason).toBe('unavailable');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('kaza plan', () => {
  test('projects a clear-by date from the owed count', async () => {
    const plan = await naseeh.getKazaPlan(UID, { today: TODAY, phrase: false });
    expect(plan.totalOwed).toBeGreaterThan(0);
    expect(plan.daysToClear).toBe(plan.totalOwed);
    expect(plan.clearedBy).toBe(iso(plan.totalOwed - 1));
    expect(plan.startWith).toBe('fajr');
    expect(plan.ai).toBe(false);
  });

  test('a model re-word that keeps the numbers is used; one that changes them is dropped', async () => {
    const plain = await naseeh.getKazaPlan(UID, { today: TODAY, phrase: false });
    mockReply(JSON.stringify({ lines: [`Good news! ${plain.lines[0]}`] }));
    const kept = await naseeh.getKazaPlan(UID, { today: TODAY, phrase: true });
    expect(kept.ai).toBe(true);
    expect(kept.lines[0]).toBe(`Good news! ${plain.lines[0]}`);

    mockReply(JSON.stringify({ lines: [plain.lines[0].replace(/\d+/, '2')] }));
    const dropped = await naseeh.getKazaPlan(UID, { today: TODAY, phrase: true });
    expect(dropped.ai).toBe(plain.totalOwed === 2);
  });
});

describe('pattern insights', () => {
  test('finds the weak prayer from the log and stays deterministic without phrase', async () => {
    const r = await naseeh.getPatternInsights(UID, { ...opts, phrase: false });
    expect(r.ai).toBe(false);
    // Only 9 days of history: below the sample floors, so no shaky findings.
    for (const f of r.findings) expect(f.text.length).toBeGreaterThan(10);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
