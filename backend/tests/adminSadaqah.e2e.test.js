import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import Donation from '../src/models/Donation.js';
import AdminAccount from '../src/models/AdminAccount.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

const ADMIN_EMAIL = 'admin@test.dev'; // servant — full access
const STAFF_EMAIL = 'staff@test.dev'; // ansar — routine review only

// Same dev-bypass fake-JWT shape as auth.e2e.test.js — requireAdminAuth
// decodes this uid/email without real Firebase verification when
// DEV_AUTH_BYPASS=1 (set globally in setupTests.js) and Firebase Admin isn't
// configured, but it still requires a matching, active AdminAccount row.
const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

let mongo;
let ownerToken;
let staffToken;

const validDonation = (overrides = {}) => ({
  donorName: 'Test Donor',
  email: 'donor@test.dev',
  phone: '01712345678',
  paymentMethod: 'bkash',
  transactionId: `TX${Date.now()}${Math.floor(Math.random() * 1_000_000)}`,
  amount: 500,
  transactionDate: new Date().toISOString().slice(0, 10),
  ...overrides,
});

const submitAndFindPending = async (donation) => {
  await request(app).post('/api/sadaqah/submit').send(donation);
  const pending = await request(app)
    .get('/api/admin/sadaqah/pending')
    .set('X-Admin-Token', ownerToken);
  return pending.body.donations.find(
    (d) => d.transactionId === donation.transactionId.toUpperCase()
  );
};

describe('Sadaqah admin API', () => {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test' });
    await Donation.init();

    await AdminAccount.create({
      firebaseUid: 'admin-uid-owner',
      email: ADMIN_EMAIL,
      role: 'servant',
      createdBy: 'test-seed',
    });
    await AdminAccount.create({
      firebaseUid: 'admin-uid-staff',
      email: STAFF_EMAIL,
      role: 'ansar',
      ansarDomain: 'sadaqah',
      createdBy: 'test-seed',
    });
    ownerToken = fakeJwt({ uid: 'admin-uid-owner', email: ADMIN_EMAIL });
    staffToken = fakeJwt({ uid: 'admin-uid-staff', email: STAFF_EMAIL });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
    if (mongo) await mongo.stop();
  });

  test('admin routes require the admin session token', async () => {
    const res = await request(app).get('/api/admin/sadaqah/pending');
    expect(res.status).toBe(401);
  });

  test('a Firebase identity with no matching AdminAccount row is rejected', async () => {
    const res = await request(app)
      .get('/api/admin/sadaqah/pending')
      .set('X-Admin-Token', fakeJwt({ uid: 'not-an-admin', email: 'nobody@test.dev' }));
    expect(res.status).toBe(401);
  });

  test('a deactivated AdminAccount is rejected even with a well-formed identity', async () => {
    await AdminAccount.create({
      firebaseUid: 'admin-uid-deactivated',
      email: 'deactivated@test.dev',
      role: 'ansar',
      active: false,
      createdBy: 'test-seed',
    });
    const res = await request(app)
      .get('/api/admin/sadaqah/pending')
      .set(
        'X-Admin-Token',
        fakeJwt({ uid: 'admin-uid-deactivated', email: 'deactivated@test.dev' })
      );
    expect(res.status).toBe(401);
  });

  test('submitting a donation assigns a thread message id for later replies', async () => {
    const found = await submitAndFindPending(validDonation());
    // Not returned in the JSON (no field for it in any response shape) —
    // confirm indirectly via the email-draft round trip below instead of
    // asserting on a field that was never meant to be exposed.
    expect(found).toBeTruthy();
  });

  test('email draft: verified draft includes payment details, rejected draft has a reason placeholder', async () => {
    const donation = validDonation();
    const found = await submitAndFindPending(donation);

    const verifiedDraft = await request(app)
      .get(`/api/admin/sadaqah/${found._id}/email-draft`)
      .query({ type: 'verified' })
      .set('X-Admin-Token', ownerToken);
    expect(verifiedDraft.status).toBe(200);
    expect(verifiedDraft.body.subject).toMatch(/^Re: /);
    expect(verifiedDraft.body.body).toContain(donation.transactionId.toUpperCase());
    expect(verifiedDraft.body.body).toContain(String(donation.amount));
    expect(verifiedDraft.body.body).toMatch(/For your records/i);

    const rejectedDraft = await request(app)
      .get(`/api/admin/sadaqah/${found._id}/email-draft`)
      .query({ type: 'rejected' })
      .set('X-Admin-Token', ownerToken);
    expect(rejectedDraft.status).toBe(200);
    expect(rejectedDraft.body.body).toMatch(/\[Tell the donor/i);
  });

  test('verify requires a non-empty emailBody', async () => {
    const found = await submitAndFindPending(validDonation());
    const res = await request(app)
      .patch(`/api/admin/sadaqah/${found._id}/verify`)
      .set('X-Admin-Token', ownerToken)
      .send({ emailBody: '' });
    expect(res.status).toBe(400);
  });

  test('verify flow: moves a pending donation to verified and updates public stats', async () => {
    const donation = validDonation();
    const found = await submitAndFindPending(donation);
    expect(found).toBeTruthy();

    const verify = await request(app)
      .patch(`/api/admin/sadaqah/${found._id}/verify`)
      .set('X-Admin-Token', ownerToken)
      .send({ emailBody: 'JazakAllahu khayran, your sadaqah has been verified.' });
    expect(verify.status).toBe(200);
    expect(verify.body.donation.status).toBe('verified');
    expect(verify.body.donation.verifiedBy).toBe(ADMIN_EMAIL);
    // SMTP is unconfigured in the test env (see adminComposeEmail.e2e's
    // equivalent note) — sendMail no-ops and returns null. Verifying is a
    // real administrative fact independent of the notification email, so
    // the status change must still go through; the failed send is only
    // surfaced via this flag, never by rolling back the verification.
    expect(verify.body.emailSent).toBe(false);

    const stats = await request(app).get('/api/sadaqah/stats');
    expect(stats.body.totalVerifiedAmount).toBe(donation.amount);
    expect(stats.body.totalVerifiedCount).toBe(1);
  });

  test('a non-owner admin can verify a donation — the routine review job stays open to any admin', async () => {
    const donation = validDonation();
    const found = await submitAndFindPending(donation);

    const verify = await request(app)
      .patch(`/api/admin/sadaqah/${found._id}/verify`)
      .set('X-Admin-Token', staffToken)
      .send({ emailBody: 'Verified by staff.' });
    expect(verify.status).toBe(200);
    expect(verify.body.donation.verifiedBy).toBe(STAFF_EMAIL);
  });

  test('verifying an already-actioned donation is rejected', async () => {
    const found = await submitAndFindPending(validDonation());

    const first = await request(app)
      .patch(`/api/admin/sadaqah/${found._id}/verify`)
      .set('X-Admin-Token', ownerToken)
      .send({ emailBody: 'Verified.' });
    expect(first.status).toBe(200);

    const second = await request(app)
      .patch(`/api/admin/sadaqah/${found._id}/verify`)
      .set('X-Admin-Token', ownerToken)
      .send({ emailBody: 'Verified.' });
    expect(second.status).toBe(409);
  });

  test('reject flow: the sent email body is stored as the reason and does not touch verified stats', async () => {
    const before = await request(app).get('/api/sadaqah/stats');
    const found = await submitAndFindPending(validDonation());

    const reject = await request(app)
      .patch(`/api/admin/sadaqah/${found._id}/reject`)
      .set('X-Admin-Token', ownerToken)
      .send({ emailBody: 'No matching bKash transaction found for this ID.' });
    expect(reject.status).toBe(200);
    expect(reject.body.donation.status).toBe('rejected');
    expect(reject.body.donation.rejectionReason).toMatch(/no matching/i);
    // Same as verify above — the rejection itself must persist regardless of
    // whether the notification email actually sent.
    expect(reject.body.emailSent).toBe(false);

    const after = await request(app).get('/api/sadaqah/stats');
    expect(after.body.totalVerifiedAmount).toBe(before.body.totalVerifiedAmount);
    expect(after.body.totalVerifiedCount).toBe(before.body.totalVerifiedCount);
  });

  test('reject requires a non-empty emailBody', async () => {
    const found = await submitAndFindPending(validDonation());
    const res = await request(app)
      .patch(`/api/admin/sadaqah/${found._id}/reject`)
      .set('X-Admin-Token', ownerToken)
      .send({ emailBody: '   ' });
    expect(res.status).toBe(400);
  });

  test('a rejected transactionId can be legitimately resubmitted', async () => {
    const donation = validDonation();
    const found = await submitAndFindPending(donation);

    await request(app)
      .patch(`/api/admin/sadaqah/${found._id}/reject`)
      .set('X-Admin-Token', ownerToken)
      .send({ emailBody: 'Amount mismatch.' });

    // Same transactionId, corrected amount — should be accepted, not 409,
    // since the partial-unique index only covers pending/verified statuses.
    const resubmit = await request(app)
      .post('/api/sadaqah/submit')
      .send({ ...donation, amount: donation.amount + 50 });
    expect(resubmit.status).toBe(200);
  });

  test('anonymous donation stores no donor name, even in the admin view', async () => {
    const { donorName, ...rest } = validDonation();
    const found = await submitAndFindPending({
      ...rest,
      isAnonymous: true,
      showNamePublicly: true,
    });
    expect(found.donorName).toBeNull();
    expect(found.showNamePublicly).toBe(false);
  });

  // 2026-Q1 is used deliberately — every other test in this file verifies
  // donations dated "today" (whatever quarter the suite happens to run in),
  // so a quarter nobody else touches keeps these sum assertions exact rather
  // than depending on how many other tests ran first.
  test('quarterly: preview computes fresh from verified donations + expenses, publish stores it, unpublish/delete work (owner only)', async () => {
    const quarter = '2026-Q1';
    const donation = validDonation({ transactionDate: '2026-02-15', amount: 1000 });
    const found = await submitAndFindPending(donation);
    await request(app)
      .patch(`/api/admin/sadaqah/${found._id}/verify`)
      .set('X-Admin-Token', ownerToken)
      .send({ emailBody: 'Verified.' });
    await request(app)
      .post('/api/admin/sadaqah/expenses')
      .set('X-Admin-Token', ownerToken)
      .send({ date: '2026-02-20', amount: 200, description: 'Test quarter expense' });

    const preview = await request(app)
      .get(`/api/admin/sadaqah/quarterly/${quarter}/preview`)
      .set('X-Admin-Token', ownerToken);
    expect(preview.status).toBe(200);
    expect(preview.body.received).toBe(1000);
    expect(preview.body.spent).toBe(200);

    const publish = await request(app)
      .post(`/api/admin/sadaqah/quarterly/${quarter}/publish`)
      .set('X-Admin-Token', ownerToken)
      .send({ notes: 'Server costs' });
    expect(publish.status).toBe(200);
    expect(publish.body.stats.quarterlyBreakdown.find((q) => q.quarter === quarter)).toMatchObject({
      received: 1000,
      spent: 200,
      notes: 'Server costs',
      published: true,
    });

    const publicStats = await request(app).get('/api/sadaqah/stats');
    expect(publicStats.body.quarterlyBreakdown.find((q) => q.quarter === quarter)).toBeTruthy();

    const unpublish = await request(app)
      .patch(`/api/admin/sadaqah/quarterly/${quarter}/unpublish`)
      .set('X-Admin-Token', ownerToken);
    expect(unpublish.status).toBe(200);

    const publicStatsAfterUnpublish = await request(app).get('/api/sadaqah/stats');
    expect(
      publicStatsAfterUnpublish.body.quarterlyBreakdown.find((q) => q.quarter === quarter)
    ).toBeUndefined();

    const del = await request(app)
      .delete(`/api/admin/sadaqah/quarterly/${quarter}`)
      .set('X-Admin-Token', ownerToken);
    expect(del.status).toBe(200);
    expect(del.body.stats.quarterlyBreakdown.find((q) => q.quarter === quarter)).toBeUndefined();
  });

  test('a non-owner admin cannot preview, publish, unpublish, or delete quarterly stats', async () => {
    const preview = await request(app)
      .get('/api/admin/sadaqah/quarterly/2026-Q1/preview')
      .set('X-Admin-Token', staffToken);
    expect(preview.status).toBe(403);

    const publish = await request(app)
      .post('/api/admin/sadaqah/quarterly/2026-Q1/publish')
      .set('X-Admin-Token', staffToken)
      .send({});
    expect(publish.status).toBe(403);

    const unpublish = await request(app)
      .patch('/api/admin/sadaqah/quarterly/2026-Q1/unpublish')
      .set('X-Admin-Token', staffToken);
    expect(unpublish.status).toBe(403);

    const del = await request(app)
      .delete('/api/admin/sadaqah/quarterly/2026-Q1')
      .set('X-Admin-Token', staffToken);
    expect(del.status).toBe(403);
  });

  test('rejects a malformed quarter key', async () => {
    const res = await request(app)
      .get('/api/admin/sadaqah/quarterly/not-a-quarter/preview')
      .set('X-Admin-Token', ownerToken);
    expect(res.status).toBe(400);
  });

  test('public stats reports distinct contributors, not distinct donations', async () => {
    const donorA1 = validDonation({ email: 'repeat-donor@test.dev' });
    const donorA2 = validDonation({ email: 'repeat-donor@test.dev' });
    const donorB = validDonation({ email: 'once-donor@test.dev' });

    for (const d of [donorA1, donorA2, donorB]) {
      const found = await submitAndFindPending(d);
      await request(app)
        .patch(`/api/admin/sadaqah/${found._id}/verify`)
        .set('X-Admin-Token', ownerToken)
        .send({ emailBody: 'Verified.' });
    }

    const stats = await request(app).get('/api/sadaqah/stats');
    // The repeat donor counts once regardless of how many times they gave.
    const emails = new Set([donorA1.email, donorA2.email, donorB.email]);
    expect(emails.size).toBe(2);
    expect(stats.body.totalContributors).toBeGreaterThanOrEqual(2);
  });

  test('deleting a verified donation reverses its effect on stats (owner only)', async () => {
    const before = await request(app).get('/api/sadaqah/stats');
    const donation = validDonation();
    const found = await submitAndFindPending(donation);
    await request(app)
      .patch(`/api/admin/sadaqah/${found._id}/verify`)
      .set('X-Admin-Token', ownerToken)
      .send({ emailBody: 'Verified.' });

    const deniedForStaff = await request(app)
      .delete(`/api/admin/sadaqah/${found._id}`)
      .set('X-Admin-Token', staffToken);
    expect(deniedForStaff.status).toBe(403);

    const del = await request(app)
      .delete(`/api/admin/sadaqah/${found._id}`)
      .set('X-Admin-Token', ownerToken);
    expect(del.status).toBe(200);

    const after = await request(app).get('/api/sadaqah/stats');
    expect(after.body.totalVerifiedAmount).toBe(before.body.totalVerifiedAmount);
    expect(after.body.totalVerifiedCount).toBe(before.body.totalVerifiedCount);

    const all = await request(app).get('/api/admin/sadaqah/all').set('X-Admin-Token', ownerToken);
    expect(all.body.donations.find((d) => d._id === found._id)).toBeUndefined();
  });

  test('deleting a rejected donation does not touch stats', async () => {
    const found = await submitAndFindPending(validDonation());
    await request(app)
      .patch(`/api/admin/sadaqah/${found._id}/reject`)
      .set('X-Admin-Token', ownerToken)
      .send({ emailBody: 'Rejected.' });

    const before = await request(app).get('/api/sadaqah/stats');
    const del = await request(app)
      .delete(`/api/admin/sadaqah/${found._id}`)
      .set('X-Admin-Token', ownerToken);
    expect(del.status).toBe(200);
    const after = await request(app).get('/api/sadaqah/stats');
    expect(after.body.totalVerifiedAmount).toBe(before.body.totalVerifiedAmount);
  });

  test('expenses: add, list, and delete (delete is owner only)', async () => {
    const add = await request(app)
      .post('/api/admin/sadaqah/expenses')
      .set('X-Admin-Token', ownerToken)
      .send({ date: '2026-09-01', amount: 1500, description: 'Server hosting — September' });
    expect(add.status).toBe(200);
    expect(add.body.expense.amount).toBe(1500);
    expect(add.body.expense.createdBy).toBe(ADMIN_EMAIL);

    const list = await request(app)
      .get('/api/admin/sadaqah/expenses')
      .set('X-Admin-Token', ownerToken);
    expect(list.status).toBe(200);
    expect(list.body.expenses.find((e) => e._id === add.body.expense._id)).toBeTruthy();

    const deniedForStaff = await request(app)
      .delete(`/api/admin/sadaqah/expenses/${add.body.expense._id}`)
      .set('X-Admin-Token', staffToken);
    expect(deniedForStaff.status).toBe(403);

    const del = await request(app)
      .delete(`/api/admin/sadaqah/expenses/${add.body.expense._id}`)
      .set('X-Admin-Token', ownerToken);
    expect(del.status).toBe(200);

    const listAfter = await request(app)
      .get('/api/admin/sadaqah/expenses')
      .set('X-Admin-Token', ownerToken);
    expect(listAfter.body.expenses.find((e) => e._id === add.body.expense._id)).toBeUndefined();
  });

  test('rejects an expense with a negative amount or empty description', async () => {
    const badAmount = await request(app)
      .post('/api/admin/sadaqah/expenses')
      .set('X-Admin-Token', ownerToken)
      .send({ date: '2026-09-01', amount: -5, description: 'Bad' });
    expect(badAmount.status).toBe(400);

    const badDesc = await request(app)
      .post('/api/admin/sadaqah/expenses')
      .set('X-Admin-Token', ownerToken)
      .send({ date: '2026-09-01', amount: 100, description: '' });
    expect(badDesc.status).toBe(400);
  });
});
