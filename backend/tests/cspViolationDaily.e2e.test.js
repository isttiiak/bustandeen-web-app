import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import AdminAccount from '../src/models/AdminAccount.js';
import CspViolationDaily, { CSP_VIOLATION_TTL_SECONDS } from '../src/models/CspViolationDaily.js';
import {
  persistDailyCounts,
  getViolationReport,
  resetCounts,
  MAX_DAILY_KEYS,
} from '../src/services/cspReport.service.js';

// Audit T1.3b option (a): Vercel Hobby keeps one hour of logs, so CSP reports
// are counted per UTC day in MongoDB (origins only, 30-day TTL) and shown in
// Admin Ops Health, to review a week before the policy is enforced.

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

const servantToken = fakeJwt({ uid: 'csp-servant', email: 'servant@test.dev' });
const ansarToken = fakeJwt({ uid: 'csp-ansar', email: 'ansar@test.dev' });

const legacy = (blocked, directive = 'script-src-elem') => ({
  'csp-report': {
    'document-uri': 'https://bustandeen.com/cycle?day=2026-10-01',
    'effective-directive': directive,
    'blocked-uri': blocked,
    'source-file': 'https://bustandeen.com/assets/index.js',
    'script-sample': 'secret',
    disposition: 'report',
  },
});

const v = (blocked) => ({
  directive: 'img-src',
  blocked,
  source: 'https://bustandeen.com',
  disposition: 'report',
});

let mongo;
let warn;

describe('CSP violation daily counts (T1.3b)', () => {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_csp_daily' });
    await CspViolationDaily.init();
    await AdminAccount.create([
      { firebaseUid: 'csp-servant', email: 'servant@test.dev', role: 'servant', createdBy: 't' },
      { firebaseUid: 'csp-ansar', email: 'ansar@test.dev', role: 'ansar', createdBy: 't' },
    ]);
  }, 120_000);

  afterAll(async () => {
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect().catch(() => {});
    if (mongo) await mongo.stop();
  });

  beforeEach(async () => {
    resetCounts();
    await CspViolationDaily.deleteMany({});
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => warn.mockRestore());

  test('a report is counted per day with origins only, nothing from the page', async () => {
    for (let i = 0; i < 3; i += 1) {
      const res = await request(app)
        .post('/api/csp-report')
        .set('Content-Type', 'application/csp-report')
        .send(JSON.stringify(legacy('https://evil.example.com/steal.js?uid=123')));
      expect(res.status).toBe(204);
    }
    const docs = await CspViolationDaily.find().lean();
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({
      day: new Date().toISOString().slice(0, 10),
      directive: 'script-src-elem',
      blocked: 'https://evil.example.com',
      source: 'https://bustandeen.com',
      disposition: 'report',
      count: 3,
    });
    const stored = JSON.stringify(docs);
    expect(stored).not.toContain('/cycle');
    expect(stored).not.toContain('uid=123');
    expect(stored).not.toContain('secret');
    expect(stored).not.toContain('steal.js');
  });

  test('counts are split by UTC day and kept 30 days (TTL)', async () => {
    await persistDailyCounts([v('data')], new Date('2026-10-09T23:59:00Z'));
    await persistDailyCounts([v('data')], new Date('2026-10-10T00:01:00Z'));
    const days = (await CspViolationDaily.find().sort({ day: 1 }).lean()).map((d) => d.day);
    expect(days).toEqual(['2026-10-09', '2026-10-10']);

    expect(CSP_VIOLATION_TTL_SECONDS).toBe(30 * 24 * 60 * 60);
    const ttl = CspViolationDaily.schema
      .indexes()
      .find(([key]) => Object.keys(key).join() === 'firstSeen')?.[1]?.expireAfterSeconds;
    expect(ttl).toBe(CSP_VIOLATION_TTL_SECONDS);
  });

  test('at most MAX_DAILY_KEYS new combinations per day; known ones still count', async () => {
    const now = new Date('2026-10-09T12:00:00Z');
    await CspViolationDaily.insertMany(
      Array.from({ length: MAX_DAILY_KEYS }, (_, i) => ({
        day: '2026-10-09',
        ...v(`https://junk${i}.example`),
        count: 1,
        firstSeen: now,
        lastSeen: now,
      }))
    );
    await persistDailyCounts([v('https://new.example'), v('https://junk0.example')], now);
    expect(await CspViolationDaily.countDocuments()).toBe(MAX_DAILY_KEYS);
    const junk0 = await CspViolationDaily.findOne({ blocked: 'https://junk0.example' }).lean();
    expect(junk0.count).toBe(2);
  });

  test('admin report: daily totals + top combinations over the last 7 days', async () => {
    const now = new Date('2026-10-09T12:00:00Z');
    await persistDailyCounts([v('data'), v('data')], new Date('2026-10-09T01:00:00Z'));
    await persistDailyCounts([v('data')], new Date('2026-10-04T01:00:00Z'));
    await persistDailyCounts([v('blob')], new Date('2026-10-03T01:00:00Z')); // 7 days ago: out

    const report = await getViolationReport(7, now);
    expect(report.sinceDay).toBe('2026-10-03');
    expect(report.daily).toEqual([
      { day: '2026-10-03', count: 1 },
      { day: '2026-10-04', count: 1 },
      { day: '2026-10-09', count: 2 },
    ]);
    expect(report.top[0]).toMatchObject({ blocked: 'data', count: 3, days: 2 });

    const shorter = await getViolationReport(6, now);
    expect(shorter.top.map((r) => r.blocked)).toEqual(['data']);
  });

  test('the endpoint is Servant-only', async () => {
    await persistDailyCounts([v('data')]);
    const ok = await request(app)
      .get('/api/admin/ops/csp-violations')
      .set('x-admin-token', servantToken);
    expect(ok.status).toBe(200);
    expect(ok.body.top[0]).toMatchObject({ blocked: 'data', count: 1 });

    const ansar = await request(app)
      .get('/api/admin/ops/csp-violations')
      .set('x-admin-token', ansarToken);
    expect(ansar.status).toBe(403);
    const anon = await request(app).get('/api/admin/ops/csp-violations');
    expect(anon.status).toBe(401);
  });
});
