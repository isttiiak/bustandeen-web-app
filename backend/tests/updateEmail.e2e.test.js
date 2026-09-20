import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import AdminAccount from '../src/models/AdminAccount.js';
import User from '../src/models/User.js';
import { selectRecipients, withTrailer } from '../src/services/updateEmail.service.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

let mongo;
let servant;
let ansar;

describe('Admin update emails', () => {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_update_email' });
    await AdminAccount.create({
      firebaseUid: 's-uid',
      email: 'servant@upd.dev',
      role: 'servant',
      createdBy: 'seed',
    });
    await AdminAccount.create({
      firebaseUid: 'a-uid',
      email: 'ansar@upd.dev',
      role: 'ansar',
      ansarDomain: 'general',
      createdBy: 'seed',
    });
    servant = fakeJwt({ uid: 's-uid', email: 'servant@upd.dev' });
    ansar = fakeJwt({ uid: 'a-uid', email: 'ansar@upd.dev' });
    await User.create([
      { uid: 'b1', email: 'b1@t.dev', displayName: 'Bilal Khan', gender: 'male' },
      { uid: 'b2', email: 'b2@t.dev', displayName: 'Yusuf', gender: 'male' },
      { uid: 's1', email: 's1@t.dev', firstName: 'Amina', gender: 'female' },
      { uid: 'n1', email: 'n1@t.dev', displayName: 'Noor' },
      { uid: 'n2', email: 'n2@t.dev', displayName: 'Sam', gender: 'prefer_not_say' },
      { uid: 'd1', email: 'd1@t.dev', gender: 'male', disabled: true },
    ]);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
    if (mongo) await mongo.stop();
  });

  const asServant = (r) => r.set('X-Admin-Token', servant);

  test('unauthenticated requests are rejected', async () => {
    const res = await request(app).get('/api/admin/update-emails/audience');
    expect(res.status).toBe(401);
  });

  test('an Ansar can use it too (Servant and Ansar both have broadcast access)', async () => {
    const a = await request(app)
      .get('/api/admin/update-emails/audience')
      .set('X-Admin-Token', ansar);
    expect(a.status).toBe(200);
  });

  test('audience counts brothers, sisters and not-set (disabled accounts excluded)', async () => {
    const res = await asServant(request(app).get('/api/admin/update-emails/audience'));
    expect(res.status).toBe(200);
    expect(res.body.brothers).toBe(2);
    expect(res.body.sisters).toBe(1);
    expect(res.body.notSet).toBe(2);
    expect(res.body.notSetUsers.map((u) => u.uid).sort()).toEqual(['n1', 'n2']);
    expect(res.body.sender).toBe('ansar@bustandeen.com');
    expect(res.body.trailer).toMatch(/Nourish Your Deen$/);
  });

  test('recipient selection follows audience and not-set mode', () => {
    const users = [
      { uid: 'b', email: 'b', name: '', group: 'male' },
      { uid: 's', email: 's', name: '', group: 'female' },
      { uid: 'n1', email: 'n1', name: '', group: 'unset' },
      { uid: 'n2', email: 'n2', name: '', group: 'unset' },
    ];
    const ids = (a, m, sel) => selectRecipients(users, a, m, sel).map((u) => u.uid);
    expect(ids('brother', 'skip')).toEqual(['b']);
    expect(ids('sister', 'include')).toEqual(['s', 'n1', 'n2']);
    expect(ids('all', 'skip')).toEqual(['b', 's']);
    expect(ids('all', 'selected', ['n2'])).toEqual(['b', 's', 'n2']);
  });

  test('trailer helper always closes with the tagline, once', () => {
    expect(withTrailer('Hello')).toMatch(/Nourish Your Deen$/);
    const once = withTrailer('Hello');
    expect(withTrailer(once)).toBe(once);
  });

  test('sending creates a history entry with one row per recipient', async () => {
    const res = await asServant(request(app).post('/api/admin/update-emails')).send({
      subject: 'Noor update',
      body: 'Assalamu alaikum, a small update.',
      audience: 'sister',
      notSetMode: 'selected',
      selectedUids: ['n1'],
    });
    expect(res.status).toBe(200);
    // SMTP is not configured under test, so each send is recorded as failed
    // rather than silently dropped.
    expect(res.body.campaign.total).toBe(2);
    expect(res.body.campaign.failed).toBe(2);

    const list = await asServant(request(app).get('/api/admin/update-emails'));
    expect(list.body.campaigns).toHaveLength(1);

    const detail = await asServant(
      request(app).get(`/api/admin/update-emails/${res.body.campaign._id}`)
    );
    expect(detail.body.recipients.map((r) => r.uid).sort()).toEqual(['n1', 's1']);
    expect(detail.body.body).toMatch(/Nourish Your Deen$/);

    const retry = await asServant(
      request(app).post(`/api/admin/update-emails/${res.body.campaign._id}/retry-failed`)
    );
    expect(retry.body.campaign.pending).toBe(2);
  });

  test('custom recipients: exactly those addresses, de-duplicated, names borrowed from accounts', async () => {
    const res = await asServant(request(app).post('/api/admin/update-emails')).send({
      subject: 'Test send',
      body: 'Assalamu alaikum, this is a test.',
      customEmails: ['someone@example.com', 'SOMEONE@example.com', 'b1@t.dev'],
    });
    expect(res.status).toBe(200);
    expect(res.body.campaign.total).toBe(2);
    expect(res.body.campaign.audience).toBe('custom');
    const detail = await asServant(
      request(app).get(`/api/admin/update-emails/${res.body.campaign._id}`)
    );
    const byEmail = Object.fromEntries(detail.body.recipients.map((r) => [r.email, r]));
    expect(byEmail['b1@t.dev'].name).toBe('Bilal');
    expect(byEmail['someone@example.com'].name).toBe('');
  });

  test('a send needs either a group or custom recipients, and custom addresses must be valid', async () => {
    const neither = await asServant(request(app).post('/api/admin/update-emails')).send({
      subject: 'x',
      body: 'y',
    });
    expect(neither.status).toBe(400);
    const bad = await asServant(request(app).post('/api/admin/update-emails')).send({
      subject: 'x',
      body: 'y',
      customEmails: ['not-an-email'],
    });
    expect(bad.status).toBe(400);
  });

  test('an empty selection is rejected', async () => {
    const res = await asServant(request(app).post('/api/admin/update-emails')).send({
      subject: 'x',
      body: 'y',
      audience: 'brother',
      notSetMode: 'skip',
      selectedUids: [],
    });
    expect(res.status).toBe(200); // 2 brothers exist, so this one is valid
    const none = await asServant(request(app).post('/api/admin/update-emails')).send({
      subject: 'x',
      body: 'y',
      audience: 'sister',
      notSetMode: 'skip',
    });
    expect(none.status).toBe(200);
    await User.deleteMany({ gender: 'female' });
    const empty = await asServant(request(app).post('/api/admin/update-emails')).send({
      subject: 'x',
      body: 'y',
      audience: 'sister',
      notSetMode: 'skip',
    });
    expect(empty.status).toBe(400);
  });
});
