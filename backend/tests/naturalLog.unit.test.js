import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as aiService from '../src/services/ai.service.js';
import * as naturalLogService from '../src/services/naturalLog.service.js';
import User from '../src/models/User.js';
import SalatLog from '../src/models/SalatLog.js';
import QuranLog from '../src/models/QuranLog.js';

// Two halves of natural-language logging, tested separately (matches the
// two-step design: parse — an AI call with nothing written yet — then commit,
// a plain data write with no AI involved):
//   1. parseNaturalLog (ai.service.ts) — mocked Groq reply -> extraction +
//      validation (unknown prayer names, non-list zikr types, pages-> ayat).
//   2. commitNaturalLog (naturalLog.service.ts) — real Mongo writes, reusing
//      each domain's own existing write path (updatePrayerStatus,
//      batchIncrementZikr, addAyatReading) — no mocking needed here at all.

function mockGroqReply(content) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ choices: [{ message: { content } }] }),
  });
}

const AI_UID = 'natlog-ai-1';
const COMMIT_UID = 'natlog-commit-1';

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_naturallog' });
  await User.create({ uid: AI_UID, email: 'natlog-ai@test.local', aiEnabled: true });
  await User.create({
    uid: COMMIT_UID,
    email: 'natlog-commit@test.local',
    zikrTypes: [{ name: 'Astaghfirullah' }],
  });
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect().catch(() => {});
  }
  if (mongo) await mongo.stop();
});

describe('parseNaturalLog', () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.GROQ_API_KEY;

  beforeEach(() => {
    process.env.GROQ_API_KEY = 'test-key';
    // Always a jest mock by default (even for the AI-disabled test below,
    // which asserts it was never actually called) — matches ai.unit.test.js's
    // pattern for the same kind of gate test.
    mockGroqReply(JSON.stringify({ salat: [], zikr: [], quran: null }));
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.GROQ_API_KEY = originalKey;
    jest.restoreAllMocks();
  });

  test('extracts a valid salat + zikr + ayat-unit quran entry', async () => {
    mockGroqReply(
      JSON.stringify({
        salat: [{ prayer: 'fajr', status: 'completed', location: 'jamat' }],
        zikr: [{ typeName: 'Astaghfirullah', count: 100 }],
        quran: { amount: 20, unit: 'count' },
      })
    );
    const result = await aiService.parseNaturalLog(
      'Prayed fajr in jamaah, 100 istighfar, read 20 ayat',
      ['Astaghfirullah', 'SubhanAllah'],
      AI_UID
    );
    expect(result.ok).toBe(true);
    expect(result.salat).toEqual([{ prayer: 'fajr', status: 'completed', location: 'jamat' }]);
    expect(result.zikr).toEqual([{ typeName: 'Astaghfirullah', count: 100 }]);
    expect(result.quran).toEqual({ ayat: 20, approximate: false });
  });

  test('converts a pages-unit quran mention using the average and flags it approximate', async () => {
    mockGroqReply(JSON.stringify({ salat: [], zikr: [], quran: { amount: 5, unit: 'pages' } }));
    const result = await aiService.parseNaturalLog('read 5 pages', [], AI_UID);
    expect(result.quran).toEqual({ ayat: 50, approximate: true });
  });

  test('drops an invalid prayer name and an invalid location rather than guessing', async () => {
    mockGroqReply(
      JSON.stringify({
        salat: [
          { prayer: 'fajr', status: 'completed', location: 'not-a-real-place' },
          { prayer: 'not-a-prayer', status: 'completed' },
        ],
        zikr: [],
        quran: null,
      })
    );
    const result = await aiService.parseNaturalLog('prayed fajr', [], AI_UID);
    expect(result.salat).toEqual([{ prayer: 'fajr', status: 'completed', location: undefined }]);
  });

  test('drops a zikr entry with a non-positive count', async () => {
    mockGroqReply(
      JSON.stringify({
        salat: [],
        zikr: [
          { typeName: 'SubhanAllah', count: 0 },
          { typeName: 'Alhamdulillah', count: 33 },
        ],
        quran: null,
      })
    );
    const result = await aiService.parseNaturalLog('some zikr', [], AI_UID);
    expect(result.zikr).toEqual([{ typeName: 'Alhamdulillah', count: 33 }]);
  });

  test('an AI-disabled user gets an empty, not-ok result and the provider is never called', async () => {
    const result = await aiService.parseNaturalLog('prayed fajr', [], 'someone-without-ai-on');
    expect(result.ok).toBe(false);
    expect(result.salat).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('parseNaturalLog units and day', () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.GROQ_API_KEY;
  beforeEach(() => {
    process.env.GROQ_API_KEY = 'test-key';
  });
  afterEach(() => {
    global.fetch = originalFetch;
    process.env.GROQ_API_KEY = originalKey;
    jest.restoreAllMocks();
  });

  test('converts juz and half pages from the raw amount, and reads "yesterday"', async () => {
    mockGroqReply(
      JSON.stringify({
        day: 'yesterday',
        salat: [],
        zikr: [],
        quran: { amount: 0.5, unit: 'pages' },
      })
    );
    const half = await aiService.parseNaturalLog('read half a page yesterday', [], AI_UID);
    expect(half.quran).toEqual({ ayat: 5, approximate: true });
    expect(half.day).toBe('yesterday');

    mockGroqReply(JSON.stringify({ salat: [], zikr: [], quran: { amount: 1, unit: 'juz' } }));
    const juz = await aiService.parseNaturalLog('read one juz', [], AI_UID);
    expect(juz.quran).toEqual({ ayat: 208, approximate: true });
    expect(juz.day).toBe('today');
  });
});

describe('commitNaturalLog', () => {
  test('applies salat, zikr and quran writes in one call', async () => {
    const result = await naturalLogService.commitNaturalLog(COMMIT_UID, {
      salat: [{ prayer: 'fajr', status: 'completed', location: 'jamat' }],
      zikr: [{ typeName: 'Astaghfirullah', count: 100 }],
      quranAyat: 20,
      date: '2026-05-01',
      timezoneOffset: 360,
    });
    expect(result).toEqual({ salatApplied: 1, zikrApplied: 1, quranApplied: true });

    const salatLog = await SalatLog.findOne({ userId: COMMIT_UID, date: '2026-05-01' });
    expect(salatLog.prayers.fajr.status).toBe('completed');
    expect(salatLog.prayers.fajr.location).toBe('jamat');

    const user = await User.findOne({ uid: COMMIT_UID });
    expect(user.zikrTotals.get('Astaghfirullah')).toBe(100);

    const quranLog = await QuranLog.findOne({ userId: COMMIT_UID, date: '2026-05-01' });
    expect(quranLog.ayat).toBe(20);
  });

  test('registers a brand-new zikr type name that was not in the user list yet', async () => {
    await naturalLogService.commitNaturalLog(COMMIT_UID, {
      salat: [],
      zikr: [{ typeName: 'Ya Rahman', count: 10 }],
      quranAyat: null,
      date: '2026-05-02',
    });
    const user = await User.findOne({ uid: COMMIT_UID });
    expect(user.zikrTypes.some((t) => t.name === 'Ya Rahman')).toBe(true);
  });

  test('re-marking a prayer already done keeps its tasbih and Ayatul Kursi ticks', async () => {
    await SalatLog.create({
      userId: COMMIT_UID,
      date: '2026-05-04',
      prayers: {
        fajr: { status: 'completed', location: 'home', tasbeeh: true, ayatulKursi: true },
      },
    });
    const result = await naturalLogService.commitNaturalLog(COMMIT_UID, {
      salat: [{ prayer: 'fajr', status: 'completed' }],
      zikr: [],
      quranAyat: null,
      date: '2026-05-04',
    });
    // Nothing to change on an already-done prayer with no new location
    expect(result.salatApplied).toBe(0);
    const log = await SalatLog.findOne({ userId: COMMIT_UID, date: '2026-05-04' });
    expect(log.prayers.fajr.tasbeeh).toBe(true);
    expect(log.prayers.fajr.ayatulKursi).toBe(true);

    // A differing location updates only the location
    await naturalLogService.commitNaturalLog(COMMIT_UID, {
      salat: [{ prayer: 'fajr', status: 'completed', location: 'jamat' }],
      zikr: [],
      quranAyat: null,
      date: '2026-05-04',
    });
    const after = await SalatLog.findOne({ userId: COMMIT_UID, date: '2026-05-04' });
    expect(after.prayers.fajr.location).toBe('jamat');
    expect(after.prayers.fajr.tasbeeh).toBe(true);
  });

  test('dhikr counts land in the day the note names bucket and merge duplicate lines', async () => {
    await naturalLogService.commitNaturalLog(COMMIT_UID, {
      salat: [],
      zikr: [
        { typeName: 'Astaghfirullah', count: 30 },
        { typeName: 'Astaghfirullah', count: 20 },
      ],
      quranAyat: null,
      date: '2026-05-05',
      timezoneOffset: 360,
    });
    const ZikrDaily = (await import('../src/models/ZikrDaily.js')).default;
    const rows = await ZikrDaily.find({ userId: COMMIT_UID, zikrType: 'Astaghfirullah' });
    const may5 = rows.find((r) => r.date.toISOString().startsWith('2026-05-05'));
    expect(may5?.count).toBe(50);
  });

  test('no quran entry when quranAyat is null', async () => {
    const result = await naturalLogService.commitNaturalLog(COMMIT_UID, {
      salat: [],
      zikr: [],
      quranAyat: null,
      date: '2026-05-03',
    });
    expect(result.quranApplied).toBe(false);
    const quranLog = await QuranLog.findOne({ userId: COMMIT_UID, date: '2026-05-03' });
    expect(quranLog).toBeNull();
  });
});
