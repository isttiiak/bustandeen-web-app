import mongoose from 'mongoose';
import { assertNotProductionOnPreview } from '../src/config/database.js';
import { connectDB } from '../src/config/mongo.js';

// Audit 2026-11-16 P3-1: a Vercel preview deploy never runs on the production
// database. Production and local development are untouched.

const PROD = 'mongodb+srv://user:secret@cluster0.dfqi0xb.mongodb.net/?retryWrites=true';
const STAGING = 'mongodb+srv://user:secret@cluster0.hc3ryr5.mongodb.net/';
const PROD_HOST = 'cluster0.dfqi0xb.mongodb.net';

const preview = (extra = {}) => ({
  VERCEL_ENV: 'preview',
  PRODUCTION_MONGO_HOST: PROD_HOST,
  ...extra,
});

describe('assertNotProductionOnPreview', () => {
  it('refuses a preview that points at the production host', () => {
    expect(() => assertNotProductionOnPreview(PROD, preview())).toThrow(/production database/);
  });

  it('names the host but never the credentials', () => {
    try {
      assertNotProductionOnPreview(PROD, preview());
      throw new Error('should have thrown');
    } catch (e) {
      expect(String(e.message)).toContain(PROD_HOST);
      expect(String(e.message)).not.toMatch(/secret|user:/);
    }
  });

  it('lets a preview use the staging cluster', () => {
    expect(() => assertNotProductionOnPreview(STAGING, preview())).not.toThrow();
  });

  it('fails closed when PRODUCTION_MONGO_HOST is missing or empty', () => {
    expect(() => assertNotProductionOnPreview(STAGING, { VERCEL_ENV: 'preview' })).toThrow(
      /PRODUCTION_MONGO_HOST is not set/
    );
    expect(() =>
      assertNotProductionOnPreview(STAGING, { VERCEL_ENV: 'preview', PRODUCTION_MONGO_HOST: ' ' })
    ).toThrow(/PRODUCTION_MONGO_HOST is not set/);
  });

  it('does not touch production deploys or local development', () => {
    expect(() =>
      assertNotProductionOnPreview(PROD, {
        VERCEL_ENV: 'production',
        PRODUCTION_MONGO_HOST: PROD_HOST,
      })
    ).not.toThrow();
    expect(() =>
      assertNotProductionOnPreview(PROD, { PRODUCTION_MONGO_HOST: PROD_HOST })
    ).not.toThrow();
    expect(() => assertNotProductionOnPreview(PROD, {})).not.toThrow();
  });

  it('also catches the same cluster written as shard hosts, with a port, in any case', () => {
    const shards =
      'mongodb://u:p@cluster0-shard-00-00.dfqi0xb.mongodb.net:27017,cluster0-shard-00-01.dfqi0xb.mongodb.net:27017/';
    expect(() => assertNotProductionOnPreview(shards, preview())).toThrow(/production database/);
    expect(() =>
      assertNotProductionOnPreview(
        STAGING,
        preview({ PRODUCTION_MONGO_HOST: PROD_HOST.toUpperCase() + ':27017' })
      )
    ).not.toThrow();
    expect(() =>
      assertNotProductionOnPreview(
        PROD,
        preview({ PRODUCTION_MONGO_HOST: PROD_HOST.toUpperCase() + ':27017' })
      )
    ).toThrow(/production database/);
  });

  it('accepts the production setting as a full URI or a comma list', () => {
    expect(() =>
      assertNotProductionOnPreview(PROD, preview({ PRODUCTION_MONGO_HOST: PROD }))
    ).toThrow();
    expect(() =>
      assertNotProductionOnPreview(
        PROD,
        preview({ PRODUCTION_MONGO_HOST: `other.example.com,${PROD_HOST}` })
      )
    ).toThrow();
  });

  it('does not mistake a different Atlas project for production', () => {
    expect(() =>
      assertNotProductionOnPreview('mongodb+srv://u:p@cluster0.zzzzzzz.mongodb.net/', preview())
    ).not.toThrow();
  });
});

describe('connectDB on a preview', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('stops before connecting when the URI is the production host', async () => {
    process.env.VERCEL_ENV = 'preview';
    process.env.PRODUCTION_MONGO_HOST = PROD_HOST;
    process.env.MONGODB_URI = PROD;
    const spy = spyOnConnect();
    await expect(connectDB()).rejects.toThrow(/production database/);
    expect(spy.calls()).toBe(0);
    spy.restore();
  });
});

function spyOnConnect() {
  const original = mongoose.connect;
  let n = 0;
  mongoose.connect = (...a) => {
    n += 1;
    return original.apply(mongoose, a);
  };
  return {
    calls: () => n,
    restore: () => {
      mongoose.connect = original;
    },
  };
}
