import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import RateLimitHit, { RATE_LIMIT_HIT_TTL_SECONDS } from '../src/models/RateLimitHit.js';
import EmailFailureLog, { EMAIL_FAILURE_TTL_SECONDS } from '../src/models/EmailFailureLog.js';

// Data retention (audit DB-01) + explicit index management (audit DB-02).
// The sync script runs in a child process against the same in-memory server,
// exactly as it would be run by hand against Atlas.

const run = promisify(execFile);
const backendDir = path.resolve(import.meta.dirname, '..');
const tsxCli = path.join(backendDir, 'node_modules', 'tsx', 'dist', 'cli.mjs');

let mongo;

async function syncIndexes(...args) {
  const { stdout } = await run(process.execPath, [tsxCli, 'src/scripts/syncIndexes.ts', ...args], {
    cwd: backendDir,
    env: { ...process.env, MONGODB_URI: mongo.getUri(), NODE_OPTIONS: '' },
  });
  return stdout;
}

const createdAtIndex = async (collection) =>
  (await mongoose.connection.db.collection(collection).indexes()).find(
    (i) => Object.keys(i.key).join() === 'createdAt'
  );

describe('Retention TTLs and syncIndexes script', () => {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan', autoIndex: false });
    // Production state before this change: a plain descending createdAt index, no TTL.
    await mongoose.connection.db.collection('ratelimithits').createIndex({ createdAt: -1 });
    await mongoose.connection.db.collection('emailfailurelogs').createIndex({ createdAt: -1 });
  }, 120_000);

  afterAll(async () => {
    await mongoose.disconnect().catch(() => {});
    if (mongo) await mongo.stop();
  });

  test('schemas declare the TTLs (30 days for IP logs, 90 for email failures)', () => {
    expect(RATE_LIMIT_HIT_TTL_SECONDS).toBe(30 * 24 * 60 * 60);
    expect(EMAIL_FAILURE_TTL_SECONDS).toBe(90 * 24 * 60 * 60);
    const ttl = (model) =>
      model.schema.indexes().find(([key]) => Object.keys(key).join() === 'createdAt')?.[1]
        ?.expireAfterSeconds;
    expect(ttl(RateLimitHit)).toBe(RATE_LIMIT_HIT_TTL_SECONDS);
    expect(ttl(EmailFailureLog)).toBe(EMAIL_FAILURE_TTL_SECONDS);
  });

  test('dry run reports the change but touches nothing', async () => {
    const out = await syncIndexes();
    expect(out).toMatch(/Dry run/);
    expect(out).toMatch(/RateLimitHit \(ratelimithits\)[\s\S]*\+ create \{"createdAt":1\}/);
    expect(out).toMatch(/- drop +createdAt_-1/);
    const idx = await createdAtIndex('ratelimithits');
    expect(idx.name).toBe('createdAt_-1');
    expect(idx.expireAfterSeconds).toBeUndefined();
  }, 120_000);

  test('--apply builds the TTL indexes and a second run is a no-op', async () => {
    await syncIndexes('--apply');
    const hits = await createdAtIndex('ratelimithits');
    const failures = await createdAtIndex('emailfailurelogs');
    expect(hits.expireAfterSeconds).toBe(RATE_LIMIT_HIT_TTL_SECONDS);
    expect(failures.expireAfterSeconds).toBe(EMAIL_FAILURE_TTL_SECONDS);

    const again = await syncIndexes();
    expect(again).toMatch(/All indexes are in sync/);
  }, 180_000);
});
