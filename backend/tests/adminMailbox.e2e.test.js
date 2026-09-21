import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import AdminAccount from '../src/models/AdminAccount.js';
import MailboxMessage from '../src/models/MailboxMessage.js';
import MailboxSyncState from '../src/models/MailboxSyncState.js';
import {
  syncMailbox,
  stripQuotedReply,
  feedbackIdFromHeaders,
} from '../src/services/mailboxSync.service.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

const SERVANT_EMAIL = 'servant@mailbox-test.dev';
const ANSAR_EMAIL = 'ansar@mailbox-test.dev';

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

const mail = (over = {}) => ({
  uid: 1,
  messageId: '<one@example.com>',
  inReplyTo: null,
  references: [],
  fromName: 'Sender',
  fromEmail: 'sender@example.com',
  subject: 'Hello',
  text: 'A real message body.',
  receivedAt: new Date('2026-09-01T10:00:00Z'),
  ...over,
});

const fetcherOf =
  (mails, maxUid = 1) =>
  async () => ({ uidValidity: '7', mails, maxUid });

let mongo;
let servantToken;
let ansarToken;

describe('Founder mailbox sync', () => {
  beforeAll(async () => {
    process.env.MAILBOX_SYNC_ENABLED = '1';
    process.env.ISTIAK_IMAP_USER = 'founder@bustandeen.test';
    process.env.ISTIAK_IMAP_PASS = 'x';
    process.env.ZOHO_IMAP_HOST = 'imap.example.test';
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_mailbox' });
    await AdminAccount.create({
      firebaseUid: 'servant-uid',
      email: SERVANT_EMAIL,
      role: 'servant',
      createdBy: 'test-seed',
    });
    await AdminAccount.create({
      firebaseUid: 'ansar-uid',
      email: ANSAR_EMAIL,
      role: 'ansar',
      ansarDomain: 'general',
      createdBy: 'test-seed',
    });
    servantToken = fakeJwt({ uid: 'servant-uid', email: SERVANT_EMAIL });
    ansarToken = fakeJwt({ uid: 'ansar-uid', email: ANSAR_EMAIL });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
    if (mongo) await mongo.stop();
  });

  beforeEach(async () => {
    await MailboxMessage.deleteMany({});
    await MailboxSyncState.deleteMany({});
  });

  test('stores new mail, dedupes by Message-ID, and advances the checkpoint', async () => {
    const first = await syncMailbox(fetcherOf([mail()], 5));
    expect(first).toEqual({ ok: true, added: 1 });
    const again = await syncMailbox(fetcherOf([mail()], 5));
    expect(again.added).toBe(0);
    expect(await MailboxMessage.countDocuments()).toBe(1);
    const state = await MailboxSyncState.findOne({ key: 'inbox' });
    expect(state.lastUid).toBe(5);
    expect(state.uidValidity).toBe('7');
    expect(state.lastError).toBeNull();
  });

  test('sync is off unless MAILBOX_SYNC_ENABLED=1, and never calls the fetcher', async () => {
    process.env.MAILBOX_SYNC_ENABLED = '0';
    try {
      let called = false;
      const res = await syncMailbox(async () => {
        called = true;
        return { uidValidity: '1', mails: [], maxUid: 0 };
      });
      expect(res.skipped).toBe('not-configured');
      expect(called).toBe(false);
      const list = await request(app)
        .get('/api/admin/feedback/mailbox')
        .set('X-Admin-Token', servantToken);
      expect(list.body.sync.enabled).toBe(false);
    } finally {
      process.env.MAILBOX_SYNC_ENABLED = '1';
    }
  });

  test('a failing fetch is recorded, not thrown, and releases the lock', async () => {
    // The service logs the failure on purpose; capture it so it neither
    // pollutes the test output nor goes unchecked.
    const logged = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await syncMailbox(async () => {
      throw new Error('AUTHENTICATIONFAILED');
    });
    expect(logged).toHaveBeenCalledWith('Mailbox sync failed:', expect.any(Error));
    logged.mockRestore();
    expect(res.ok).toBe(false);
    const state = await MailboxSyncState.findOne({ key: 'inbox' });
    expect(state.lastError).toMatch(/AUTHENTICATIONFAILED/);
    expect(state.lockedUntil).toBeNull();
    const next = await syncMailbox(fetcherOf([mail()]));
    expect(next.ok).toBe(true);
  });

  test('a held lock skips the run instead of overlapping', async () => {
    await MailboxSyncState.create({ key: 'inbox', lockedUntil: new Date(Date.now() + 60_000) });
    const res = await syncMailbox(fetcherOf([mail()]));
    expect(res.skipped).toBe('busy');
    expect(await MailboxMessage.countDocuments()).toBe(0);
  });

  test('links a reply to the feedback thread it belongs to', async () => {
    const id = new mongoose.Types.ObjectId().toString();
    await syncMailbox(
      fetcherOf([
        mail({ inReplyTo: '<x@y>', references: ['<x@y>', `<feedback-${id}@bustandeen.com>`] }),
      ])
    );
    const stored = await MailboxMessage.findOne({});
    expect(stored.feedbackId).toBe(id);
  });

  test('helpers: quoted history is cut, admin-notify ids are not thread links', () => {
    expect(
      stripQuotedReply('Thanks a lot!\n\nOn Mon, 1 Sep 2026, Istiak <a@b.c> wrote:\n> old text')
    ).toBe('Thanks a lot!');
    expect(stripQuotedReply('Line one\n> quoted')).toBe('Line one');
    expect(feedbackIdFromHeaders(null, ['<feedback-admin-abc@bustandeen.com>'])).toBeNull();
  });

  test('mailbox routes are Servant-only', async () => {
    expect((await request(app).get('/api/admin/feedback/mailbox')).status).toBe(401);
    const res = await request(app)
      .get('/api/admin/feedback/mailbox')
      .set('X-Admin-Token', ansarToken);
    expect(res.status).toBe(403);
  });

  test('the Servant can list, archive, mark replied and delete', async () => {
    await syncMailbox(fetcherOf([mail()]));
    const msg = await MailboxMessage.findOne({});

    const list = await request(app)
      .get('/api/admin/feedback/mailbox?status=open')
      .set('X-Admin-Token', servantToken);
    expect(list.status).toBe(200);
    expect(list.body.messages).toHaveLength(1);
    expect(list.body.sync.configured).toBe(true);

    const replied = await request(app)
      .patch(`/api/admin/feedback/mailbox/${msg._id}/mark-replied-external`)
      .set('X-Admin-Token', servantToken);
    expect(replied.body.message.status).toBe('replied');

    const archived = await request(app)
      .patch(`/api/admin/feedback/mailbox/${msg._id}/archive`)
      .set('X-Admin-Token', servantToken);
    expect(archived.body.message.status).toBe('archived');

    const del = await request(app)
      .delete(`/api/admin/feedback/mailbox/${msg._id}`)
      .set('X-Admin-Token', servantToken);
    expect(del.status).toBe(200);
    expect(await MailboxMessage.countDocuments()).toBe(0);
  });

  test('reply fails loudly (502) when SMTP is unconfigured and leaves the message open', async () => {
    await syncMailbox(fetcherOf([mail()]));
    const msg = await MailboxMessage.findOne({});
    const res = await request(app)
      .post(`/api/admin/feedback/mailbox/${msg._id}/reply`)
      .set('X-Admin-Token', servantToken)
      .send({ body: 'Wa alaikum assalam, thank you.' });
    expect(res.status).toBe(502);
    expect((await MailboxMessage.findById(msg._id)).status).toBe('open');
  });
});
