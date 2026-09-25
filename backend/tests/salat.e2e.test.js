import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { MongoMemoryServer } from 'mongodb-memory-server';
import SalatDebtModel from '../src/models/SalatDebt.js';
import SalatLogModel from '../src/models/SalatLog.js';

const shiftDateStr = (dateStr, delta) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().substring(0, 10);
};

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

let mongo;

describe('Salat API', () => {
  beforeAll(async () => {
    process.env.DEV_AUTH_BYPASS = '1';
    mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri();
    await mongoose.connect(uri, { dbName: 'ihsan_test_salat' });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
    if (mongo) await mongo.stop();
  });

  const token = fakeJwt({ uid: 'sal1', email: 'sal1@test.dev', name: 'Sal1' });
  const auth = (r) => r.set('Authorization', `Bearer ${token}`);
  const today = new Date().toISOString().substring(0, 10);

  test('GET / requires auth', async () => {
    const res = await request(app).get('/api/salat');
    expect(res.status).toBe(401);
  });

  test('GET / returns empty log for today on first call', async () => {
    // Ensure user exists
    await request(app).post('/api/auth/verify').send({ idToken: token });

    const res = await auth(request(app).get(`/api/salat?date=${today}`));
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('PATCH /prayer marks a prayer completed and logs debt on miss', async () => {
    const token2 = fakeJwt({ uid: 'sal2', email: 'sal2@test.dev', name: 'Sal2' });
    const auth2 = (r) => r.set('Authorization', `Bearer ${token2}`);

    await request(app).post('/api/auth/verify').send({ idToken: token2 });

    // Complete fajr
    const res = await auth2(
      request(app)
        .patch('/api/salat/prayer')
        .send({ date: today, prayer: 'fajr', status: 'completed' })
    );
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    // Verify the log has fajr completed
    const log = await auth2(request(app).get(`/api/salat?date=${today}`));
    expect(log.status).toBe(200);
    const prayers = log.body.log?.prayers ?? {};
    expect(prayers.fajr?.status).toBe('completed');
  });

  test('PATCH /prayer increments debt when prayer marked missed', async () => {
    const token3 = fakeJwt({ uid: 'sal3', email: 'sal3@test.dev', name: 'Sal3' });
    const auth3 = (r) => r.set('Authorization', `Bearer ${token3}`);

    await request(app).post('/api/auth/verify').send({ idToken: token3 });

    // Check initial debt (response spreads { owed, totalOwed } at body level)
    const debt0 = await auth3(request(app).get('/api/salat/debt'));
    expect(debt0.status).toBe(200);
    const initialFajrDebt = debt0.body.owed?.fajr ?? 0;

    // Mark fajr missed
    await auth3(
      request(app)
        .patch('/api/salat/prayer')
        .send({ date: today, prayer: 'fajr', status: 'missed' })
    );

    const debt1 = await auth3(request(app).get('/api/salat/debt'));
    expect(debt1.status).toBe(200);
    expect(debt1.body.owed.fajr).toBe(initialFajrDebt + 1);

    // Undo the miss → debt decrements
    await auth3(
      request(app)
        .patch('/api/salat/prayer')
        .send({ date: today, prayer: 'fajr', status: 'completed' })
    );

    const debt2 = await auth3(request(app).get('/api/salat/debt'));
    expect(debt2.status).toBe(200);
    expect(debt2.body.owed.fajr).toBe(initialFajrDebt);
  });

  test('PATCH /nafl stores nafl data', async () => {
    const res = await auth(
      request(app)
        .patch('/api/salat/nafl')
        .send({ date: today, completed: true, types: ['tahajjud', 'duha'], rakat: 4 })
    );
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const log = await auth(request(app).get(`/api/salat?date=${today}`));
    expect(log.body.log?.nafl?.types).toEqual(expect.arrayContaining(['tahajjud', 'duha']));
  });

  test('GET /analytics returns completion stats', async () => {
    const res = await auth(request(app).get('/api/salat/analytics?days=7'));
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(typeof res.body.completionRate).toBe('number');
    expect(typeof res.body.currentStreak).toBe('number');
  });

  test('GET /analytics calendarData.logged distinguishes "no row" from "logged, 0 done"', async () => {
    const token11 = fakeJwt({ uid: 'sal11', email: 'sal11@test.dev', name: 'Sal11' });
    const auth11 = (r) => r.set('Authorization', `Bearer ${token11}`);
    await request(app).post('/api/auth/verify').send({ idToken: token11 });

    const twoDaysAgo = shiftDateStr(today, -2);
    // twoDaysAgo: a real log row exists, but nothing on it was marked done —
    // must still read logged:true, not be confused with a day with no row.
    await SalatLogModel.create({ userId: 'sal11', date: twoDaysAgo });
    // yesterday: never opened at all — no row.

    const res = await auth11(request(app).get('/api/salat/analytics?days=7'));
    expect(res.status).toBe(200);
    const loggedDay = res.body.calendarData.find((c) => c.date === twoDaysAgo);
    const unloggedYesterday = res.body.calendarData.find((c) => c.date === shiftDateStr(today, -1));
    expect(loggedDay.logged).toBe(true);
    expect(loggedDay.completed).toBe(0);
    expect(unloggedYesterday.logged).toBe(false);
  });

  test('GET /analytics does not grade days before tracking began as missed', async () => {
    const tokenN = fakeJwt({ uid: 'salNew', email: 'salnew@test.dev', name: 'SalNew' });
    const authN = (r) => r.set('Authorization', `Bearer ${tokenN}`);
    await request(app).post('/api/auth/verify').send({ idToken: tokenN });

    // Account was created just now, so a year-long window must collapse to
    // "since signup" rather than count ~360 days nobody could have logged.
    const res = await authN(request(app).get(`/api/salat/analytics?days=365&today=${today}`));
    expect(res.status).toBe(200);
    expect(res.body.periodDays).toBe(365);
    expect(res.body.totalDays).toBeLessThanOrEqual(2);
    expect(res.body.missedCount).toBeLessThanOrEqual(10);
  });

  test('GET /analytics and /debt/history accept an all-time window', async () => {
    const a = await auth(request(app).get(`/api/salat/analytics?days=3650&today=${today}`));
    expect(a.status).toBe(200);
    const h = await auth(request(app).get(`/api/salat/debt/history?days=3650&today=${today}`));
    expect(h.status).toBe(200);
    // buckets cover the whole window in at most 12 bars
    expect(h.body.weeks.length).toBeLessThanOrEqual(12);
  });

  test('GET /debt/history returns weeks array', async () => {
    const res = await auth(request(app).get('/api/salat/debt/history?days=30'));
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.weeks)).toBe(true);
  });

  test('PATCH /debt/adjust changes debt by delta', async () => {
    const token4 = fakeJwt({ uid: 'sal4', email: 'sal4@test.dev', name: 'Sal4' });
    const auth4 = (r) => r.set('Authorization', `Bearer ${token4}`);

    await request(app).post('/api/auth/verify').send({ idToken: token4 });

    // Adjust fajr debt by +2 (response spreads owed directly, not nested under debt)
    const adj = await auth4(
      request(app).patch('/api/salat/debt/adjust').send({ prayer: 'fajr', delta: 2, date: today })
    );
    expect(adj.status).toBe(200);
    expect(adj.body.owed.fajr).toBe(2);

    const debt = await auth4(request(app).get('/api/salat/debt'));
    expect(debt.body.owed.fajr).toBe(2);
  });

  test('DELETE /all removes all salat data', async () => {
    const token5 = fakeJwt({ uid: 'sal5', email: 'sal5@test.dev', name: 'Sal5' });
    const auth5 = (r) => r.set('Authorization', `Bearer ${token5}`);

    await request(app).post('/api/auth/verify').send({ idToken: token5 });

    // Log something first
    await auth5(
      request(app)
        .patch('/api/salat/prayer')
        .send({ date: today, prayer: 'dhuhr', status: 'completed' })
    );

    // Delete all
    const del = await auth5(request(app).delete('/api/salat/all'));
    expect(del.status).toBe(200);

    // Log should now be empty
    const after = await auth5(request(app).get(`/api/salat?date=${today}`));
    expect(after.status).toBe(200);
    const prayers = after.body.log?.prayers ?? {};
    expect(prayers.dhuhr?.status ?? 'pending').toBe('pending');
  });

  test('PATCH /prayer stores Musafir qasr/jam flags and clears them on un-mark', async () => {
    const tokenM = fakeJwt({ uid: 'salM', email: 'salm@test.dev', name: 'SalM' });
    const authM = (r) => r.set('Authorization', `Bearer ${tokenM}`);
    await request(app).post('/api/auth/verify').send({ idToken: tokenM });

    const res = await authM(
      request(app)
        .patch('/api/salat/prayer')
        .send({ date: today, prayer: 'asr', status: 'completed', qasr: true, jam: 'taqdim' })
    );
    expect(res.status).toBe(200);
    expect(res.body.log.prayers.asr.qasr).toBe(true);
    expect(res.body.log.prayers.asr.jam).toBe('taqdim');

    // A sub-tag tap omits the flags: they must survive.
    const tag = await authM(
      request(app)
        .patch('/api/salat/prayer')
        .send({ date: today, prayer: 'asr', status: 'completed', tasbeeh: true })
    );
    expect(tag.body.log.prayers.asr.qasr).toBe(true);
    expect(tag.body.log.prayers.asr.jam).toBe('taqdim');

    // jam: null clears the combining flag only.
    const unjam = await authM(
      request(app)
        .patch('/api/salat/prayer')
        .send({ date: today, prayer: 'asr', status: 'completed', jam: null })
    );
    expect(unjam.body.log.prayers.asr.jam).toBeUndefined();
    expect(unjam.body.log.prayers.asr.qasr).toBe(true);

    // Fajr and Maghrib are never shortened.
    const fajr = await authM(
      request(app)
        .patch('/api/salat/prayer')
        .send({ date: today, prayer: 'maghrib', status: 'completed', qasr: true })
    );
    expect(fajr.body.log.prayers.maghrib.qasr).toBeUndefined();

    // Back to pending wipes the travel flags.
    const pending = await authM(
      request(app)
        .patch('/api/salat/prayer')
        .send({ date: today, prayer: 'asr', status: 'pending' })
    );
    expect(pending.body.log.prayers.asr.qasr).toBeUndefined();
  });

  test('Friday Dhuhr prayed as qasr is Zuhr, not Jumuah: location is kept', async () => {
    const tokenF = fakeJwt({ uid: 'salF', email: 'salf@test.dev', name: 'SalF' });
    const authF = (r) => r.set('Authorization', `Bearer ${tokenF}`);
    await request(app).post('/api/auth/verify').send({ idToken: tokenF });
    // Most recent Friday on or before today.
    const d = new Date(today + 'T12:00:00');
    while (d.getDay() !== 5) d.setDate(d.getDate() - 1);
    const friday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const travel = await authF(
      request(app).patch('/api/salat/prayer').send({
        date: friday,
        prayer: 'dhuhr',
        status: 'completed',
        location: 'jamat',
        qasr: true,
      })
    );
    expect(travel.status).toBe(200);
    expect(travel.body.log.prayers.dhuhr.location).toBe('jamat');

    const resident = await authF(
      request(app).patch('/api/salat/prayer').send({
        date: friday,
        prayer: 'dhuhr',
        status: 'completed',
        location: 'home',
        qasr: false,
      })
    );
    // qasr:false on a travel Friday = attended Jumu'ah: stored, and it is a mosque prayer.
    expect(resident.body.log.prayers.dhuhr.qasr).toBe(false);
    expect(resident.body.log.prayers.dhuhr.location).toBe('mosque');
  });

  test('GET /history returns logs for the requested range', async () => {
    const res = await auth(request(app).get('/api/salat/history?days=7'));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.logs ?? res.body.calendar)).toBe(true);
  });

  test('GET /journey returns phase list; POST /reset appends a phase with note', async () => {
    const token6 = fakeJwt({ uid: 'sal6', email: 'sal6@test.dev', name: 'Sal6' });
    const auth6 = (r) => r.set('Authorization', `Bearer ${token6}`);

    // Ensure user exists
    await auth6(request(app).post('/api/auth/verify').send({ token: token6 }));

    // Journey with no resets: one phase from account creation
    const j1 = await auth6(request(app).get(`/api/salat/journey?today=${today}`));
    expect(j1.status).toBe(200);
    expect(Array.isArray(j1.body.phases)).toBe(true);
    expect(j1.body.phases.length).toBe(1);
    expect(j1.body.phases[0].to).toBeNull(); // current phase

    // Reset with a note
    const reset = await auth6(
      request(app).post('/api/salat/reset').send({ today, note: 'Fresh start' })
    );
    expect(reset.status).toBe(200);
    expect(reset.body.resetDate).toBe(today);

    // Journey should now have two phases (current + pre-reset)
    const j2 = await auth6(request(app).get(`/api/salat/journey?today=${today}`));
    expect(j2.status).toBe(200);
    // Current phase (newest) is first; pre-reset phase has a resetNote
    expect(j2.body.phases[0].to).toBeNull(); // current
    const closedPhase = j2.body.phases.find((p) => p.to !== null);
    expect(closedPhase?.resetNote).toBe('Fresh start');
  });

  test('ensureCaughtUp auto-marks past pending prayers as missed and accrues debt', async () => {
    const token7 = fakeJwt({ uid: 'sal7', email: 'sal7@test.dev', name: 'Sal7' });
    const auth7 = (r) => r.set('Authorization', `Bearer ${token7}`);
    await request(app).post('/api/auth/verify').send({ idToken: token7 });

    const yesterday = shiftDateStr(today, -1);
    const twoDaysAgo = shiftDateStr(today, -2);
    const threeDaysAgo = shiftDateStr(today, -3);

    // Simulate a debt doc that was last swept 3 days ago — so twoDaysAgo and
    // yesterday still need catching up, threeDaysAgo does not.
    await SalatDebtModel.create({
      userId: 'sal7',
      owed: {},
      since: threeDaysAgo,
      lastAccrualDate: threeDaysAgo,
    });

    // twoDaysAgo: fajr was prayed, the other 4 fards were left pending.
    // yesterday: no log row at all (never opened the app) — all 5 pending.
    await SalatLogModel.create({
      userId: 'sal7',
      date: twoDaysAgo,
      prayers: { fajr: { status: 'completed' } },
    });

    const debtRes = await auth7(request(app).get('/api/salat/debt'));
    expect(debtRes.status).toBe(200);
    expect(debtRes.body.owed.fajr).toBe(1); // only yesterday's unlogged day
    expect(debtRes.body.owed.dhuhr).toBe(2);
    expect(debtRes.body.owed.asr).toBe(2);
    expect(debtRes.body.owed.maghrib).toBe(2);
    expect(debtRes.body.owed.isha).toBe(2);
    expect(debtRes.body.totalOwed).toBe(9);
    expect(debtRes.body.since).toBe(threeDaysAgo);

    // The existing log's pending prayers are now persisted as 'missed';
    // fajr (already completed) is untouched.
    const logDoc = await SalatLogModel.findOne({ userId: 'sal7', date: twoDaysAgo });
    expect(logDoc.prayers.dhuhr.status).toBe('missed');
    expect(logDoc.prayers.fajr.status).toBe('completed');

    // A day with no log at all now gets one created, every fard 'missed' —
    // otherwise later marking that day's prayer "done" starts from a fresh
    // 'pending' row and the debt never decrements (see salatDebt.service.ts).
    const yesterdayLog = await SalatLogModel.findOne({ userId: 'sal7', date: yesterday });
    expect(yesterdayLog).not.toBeNull();
    expect(yesterdayLog.prayers.fajr.status).toBe('missed');
    expect(yesterdayLog.prayers.isha.status).toBe('missed');

    // Idempotent: a second read must not double-count the same days.
    const debtRes2 = await auth7(request(app).get('/api/salat/debt'));
    expect(debtRes2.body.owed.fajr).toBe(1);
    expect(debtRes2.body.totalOwed).toBe(9);

    // The actual bug this fix addresses: marking yesterday's swept-missed
    // fajr as completed (prayed late, just never logged in time) must now
    // decrement the debt counter instead of leaving it stuck.
    const markDone = await auth7(
      request(app)
        .patch('/api/salat/prayer')
        .send({ prayer: 'fajr', status: 'completed', date: yesterday })
    );
    expect(markDone.status).toBe(200);
    const debtRes3 = await auth7(request(app).get('/api/salat/debt'));
    expect(debtRes3.body.owed.fajr).toBe(0);
    expect(debtRes3.body.totalOwed).toBe(8);
  });

  test('ensureCaughtUp is race-safe: concurrent requests must not multiply the debt', async () => {
    // Reproduces exactly the reported bug: the frontend fires several GET
    // endpoints in parallel on one page load (summary/analytics/debt/salat
    // all call ensureCaughtUp), and without an atomic claim each one reads
    // the same stale lastAccrualDate, independently computes the same "days
    // to sweep," and each applies its own $inc — 1 real missed prayer was
    // showing as 2-4x, depending on how many requests happened to race.
    const token10 = fakeJwt({ uid: 'sal10', email: 'sal10@test.dev', name: 'Sal10' });
    const auth10 = (r) => r.set('Authorization', `Bearer ${token10}`);
    await request(app).post('/api/auth/verify').send({ idToken: token10 });

    const fiveDaysAgo = shiftDateStr(today, -5);

    // Debt doc last swept 5 days ago — 4 whole days (fiveDaysAgo+1 .. today-1)
    // with no log rows at all need catching up, each contributing exactly 1
    // to every prayer's count.
    await SalatDebtModel.create({
      userId: 'sal10',
      owed: {},
      since: fiveDaysAgo,
      lastAccrualDate: fiveDaysAgo,
    });

    const CONCURRENCY = 8;
    const results = await Promise.all(
      Array.from({ length: CONCURRENCY }, () => auth10(request(app).get('/api/salat/debt')))
    );
    for (const res of results) expect(res.status).toBe(200);

    // From fiveDaysAgo+1 up to (not including) today = 4 days owed per prayer,
    // regardless of how many of the 8 concurrent requests raced for it.
    const expectedPerPrayer = 4;
    const final = await auth10(request(app).get('/api/salat/debt'));
    expect(final.body.owed.fajr).toBe(expectedPerPrayer);
    expect(final.body.owed.isha).toBe(expectedPerPrayer);
    expect(final.body.totalOwed).toBe(expectedPerPrayer * 5);

    // Also assert directly against every individual concurrent response —
    // none of them should have observed (or caused) a higher count either.
    for (const res of results) {
      expect(res.body.totalOwed).toBeLessThanOrEqual(expectedPerPrayer * 5);
    }
  });

  test('ensureCaughtUp respects an explicit ?today= (Fajr-tracking day) instead of the server civil clock', async () => {
    const token9 = fakeJwt({ uid: 'sal9', email: 'sal9@test.dev', name: 'Sal9' });
    const auth9 = (r) => r.set('Authorization', `Bearer ${token9}`);
    await request(app).post('/api/auth/verify').send({ idToken: token9 });

    const yesterday = shiftDateStr(today, -1);
    const twoDaysAgo = shiftDateStr(today, -2);

    await SalatDebtModel.create({
      userId: 'sal9',
      owed: {},
      since: twoDaysAgo,
      lastAccrualDate: twoDaysAgo,
    });

    // Yesterday's tracking day: Isha not logged yet — still open by the
    // caller's own account (e.g. it's past midnight UTC but before that
    // user's next Fajr).
    await SalatLogModel.create({
      userId: 'sal9',
      date: yesterday,
      prayers: { fajr: { status: 'completed' } },
    });

    // Client says the tracking day hasn't rolled past "yesterday" yet —
    // the sweep must not touch yesterday's still-open log.
    const held = await auth9(request(app).get(`/api/salat/debt?today=${yesterday}`));
    expect(held.status).toBe(200);
    expect(held.body.totalOwed).toBe(0);
    const heldLog = await SalatLogModel.findOne({ userId: 'sal9', date: yesterday });
    expect(heldLog.prayers.isha.status).toBe('pending');

    // Once the client agrees the tracking day has actually advanced to
    // today, the sweep catches yesterday's unresolved prayers up as missed.
    const caughtUp = await auth9(request(app).get(`/api/salat/debt?today=${today}`));
    expect(caughtUp.status).toBe(200);
    expect(caughtUp.body.owed.isha).toBe(1);
    expect(caughtUp.body.owed.dhuhr).toBe(1);
    expect(caughtUp.body.owed.fajr).toBe(0);
    const caughtUpLog = await SalatLogModel.findOne({ userId: 'sal9', date: yesterday });
    expect(caughtUpLog.prayers.isha.status).toBe('missed');
  });

  test('POST /debt/reset zeroes debt and restarts the counting period', async () => {
    const token8 = fakeJwt({ uid: 'sal8', email: 'sal8@test.dev', name: 'Sal8' });
    const auth8 = (r) => r.set('Authorization', `Bearer ${token8}`);
    await request(app).post('/api/auth/verify').send({ idToken: token8 });

    await auth8(
      request(app).patch('/api/salat/debt/adjust').send({ prayer: 'fajr', delta: 5, date: today })
    );
    const before = await auth8(request(app).get('/api/salat/debt'));
    expect(before.body.owed.fajr).toBe(5);

    const reset = await auth8(request(app).post('/api/salat/debt/reset').send({ today }));
    expect(reset.status).toBe(200);
    expect(reset.body.totalOwed).toBe(0);
    expect(reset.body.since).toBe(today);

    const after = await auth8(request(app).get('/api/salat/debt'));
    expect(after.body.totalOwed).toBe(0);
    expect(after.body.since).toBe(today);
  });
});
