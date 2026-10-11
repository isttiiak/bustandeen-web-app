import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import AdminAccount from '../src/models/AdminAccount.js';
import ClientErrorDaily from '../src/models/ClientErrorDaily.js';
import {
  scrubMessage,
  whereOf,
  resetClientErrorCounts,
} from '../src/services/clientError.service.js';

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

const report = (over = {}) => ({
  kind: 'error',
  message: 'Cannot read properties of undefined (reading "fajr")',
  file: '/assets/SalatTracker-DPxpfXv0.js',
  line: 1234,
  route: '/salat',
  version: '5.158.3',
  ...over,
});

let mongo;

describe('App error reports (frontend error reporting)', () => {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_client_errors' });
    await ClientErrorDaily.init();
    await AdminAccount.create({
      firebaseUid: 'ce-servant',
      email: 'servant@test.dev',
      role: 'servant',
      createdBy: 'test-seed',
    });
  });

  beforeEach(() => resetClientErrorCounts());

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
    if (mongo) await mongo.stop();
  });

  test('scrubs addresses, emails and long numbers from the message', () => {
    expect(
      scrubMessage(
        'Failed for user a.b@mail.com at https://bustandeen.com/connect/ABC123?x=1 id 4455667'
      )
    ).toBe('Failed for user <email> at https://bustandeen.com id #');
    expect(scrubMessage('  ')).toBe('unknown');
    expect(scrubMessage('x'.repeat(500))).toHaveLength(200);
  });

  test('keeps only our bundle file name (without its hash) and line', () => {
    expect(whereOf('/assets/main-DPxpfXv0.js', 12)).toBe('main.js:12');
    expect(whereOf('/sw.js', undefined)).toBe('sw.js');
    expect(whereOf('/assets/vendor-react-B46skpNN.js', 3)).toBe('vendor-react.js:3');
    expect(whereOf(undefined, 3)).toBe('unknown');
    expect(whereOf('https://evil.example/x.js', 3)).toBe('unknown');
    expect(whereOf('/assets/style.css', 3)).toBe('unknown');
  });

  test('a report is counted per day; the same error twice adds to one counter', async () => {
    for (let i = 0; i < 2; i++) {
      const res = await request(app).post('/api/client-errors').send(report());
      expect(res.status).toBe(204);
    }
    const docs = await ClientErrorDaily.find({}).lean();
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({
      kind: 'error',
      where: 'SalatTracker.js:1234',
      route: '/salat',
      version: '5.158.3',
      count: 2,
    });
    expect(docs[0].message).toBe('Cannot read properties of undefined (reading "fajr")');
  });

  test('sendBeacon text/plain bodies are accepted too', async () => {
    const res = await request(app)
      .post('/api/client-errors')
      .set('Content-Type', 'text/plain')
      .send(JSON.stringify(report({ kind: 'rejection', message: 'boom' })));
    expect(res.status).toBe(204);
    expect(await ClientErrorDaily.countDocuments({ kind: 'rejection' })).toBe(1);
  });

  test('nothing personal is stored: no IP, user, user agent or page address', async () => {
    await request(app)
      .post('/api/client-errors')
      .set('User-Agent', 'Secret Phone 1.0')
      .set('Authorization', `Bearer ${fakeJwt({ uid: 'someone' })}`)
      .send(report({ message: 'private', route: '/private' }));
    const doc = await ClientErrorDaily.findOne({ message: 'private' }).lean();
    const stored = JSON.stringify(doc);
    expect(stored).not.toMatch(/someone|Secret Phone|127\.0\.0\.1|::1/);
    expect(Object.keys(doc).sort()).toEqual(
      [
        '__v',
        '_id',
        'count',
        'day',
        'firstSeen',
        'kind',
        'lastSeen',
        'message',
        'route',
        'version',
        'where',
      ].sort()
    );
  });

  test('malformed reports are refused', async () => {
    for (const bad of [
      report({ kind: 'nope' }),
      report({ route: 'https://bustandeen.com/cycle' }),
      report({ version: 'latest' }),
      report({ file: 'https://evil.example/x.js' }),
      { message: 'only' },
    ]) {
      const res = await request(app).post('/api/client-errors').send(bad);
      expect(res.status).toBe(400);
    }
  });

  test('the Servant sees the last 7 days in Ops health; anonymous callers do not', async () => {
    const anon = await request(app).get('/api/admin/ops/client-errors');
    expect(anon.status).toBe(401);
    const res = await request(app)
      .get('/api/admin/ops/client-errors')
      .set('X-Admin-Token', fakeJwt({ uid: 'ce-servant' }));
    expect(res.status).toBe(200);
    expect(res.body.top[0]).toMatchObject({ where: 'SalatTracker.js:1234', count: 2 });
    expect(res.body.daily.reduce((s, d) => s + d.count, 0)).toBeGreaterThanOrEqual(4);
  });
});
