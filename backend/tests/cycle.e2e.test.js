import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

let mongo;

const shift = (dayStr, delta) => {
  const d = new Date(dayStr + 'T12:00:00.000Z');
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
};

describe('Rayhanah Cycle API', () => {
  beforeAll(async () => {
    process.env.DEV_AUTH_BYPASS = '1';
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test' });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
    if (mongo) await mongo.stop();
  });

  const tokenM = fakeJwt({ uid: 'maryam', email: 'maryam@test.dev', name: 'Maryam' });
  const tokenZ = fakeJwt({ uid: 'zaid', email: 'zaid@test.dev', name: 'Zaid' });
  const asM = (r) => r.set('Authorization', `Bearer ${tokenM}`);
  const asZ = (r) => r.set('Authorization', `Bearer ${tokenZ}`);

  const TZ = 360;
  const TODAY = new Date(Date.now() + TZ * 60 * 1000).toISOString().slice(0, 10);

  test('summary requires auth', async () => {
    const res = await request(app).get(`/api/cycle/summary`);
    expect(res.status).toBe(401);
  });

  test('start → active status with day count; double-start rejected', async () => {
    await request(app).post(`/api/auth/verify`).send({ idToken: tokenM });

    const started = await asM(request(app).post(`/api/cycle/start`)).send({
      date: shift(TODAY, -3),
      type: 'hayd',
    });
    expect(started.status).toBe(200);

    const sum = await asM(request(app).get(`/api/cycle/summary?today=${TODAY}`));
    expect(sum.status).toBe(200);
    expect(sum.body.active).not.toBeNull();
    expect(sum.body.active.type).toBe('hayd');
    expect(sum.body.active.dayCount).toBe(4); // day -3 .. today inclusive
    expect(sum.body.active.beyondMax).toBe(false);
    expect(sum.body.madhab).toBe('majority');

    const again = await asM(request(app).post(`/api/cycle/start`)).send({ date: TODAY });
    expect(again.status).toBe(400);
  });

  test('madhab setting changes the hayd maximum', async () => {
    const upd = await asM(request(app).patch(`/api/cycle/profile`)).send({ madhab: 'hanafi' });
    expect(upd.status).toBe(200);
    const sum = await asM(request(app).get(`/api/cycle/summary?today=${TODAY}`));
    expect(sum.body.active.maxDays).toBe(10);
  });

  test('excused leaderboard day: Noor substituted, chips masked, no excused flag leaks', async () => {
    // Maryam does zikr (meets the default goal 100, incl. istighfar) while excused
    await asM(request(app).post(`/api/zikr/increment/batch`)).send({
      increments: [
        { zikrType: 'SubhanAllah', amount: 80 },
        { zikrType: 'Astaghfirullah', amount: 40 },
      ],
      timezoneOffset: TZ,
      today: TODAY,
    });

    const sum = await asM(
      request(app).get(`/api/social/summary?today=${TODAY}&timezoneOffset=${TZ}`)
    );
    expect(sum.status).toBe(200);
    const me = sum.body.leaderboard.find((f) => f.isMe);

    // Excused score: zikr goal met 40 + quran 0 + salawat 10 + steadiness 1 = 51
    expect(me.score).toBe(51);
    // The masked salat chip is capped by prayers plausibly elapsed at the
    // viewer's local clock (a 4/5 at Dhuhr was a synthetic-number giveaway) —
    // mirror the service's coarse windows so this test is stable at any hour.
    const now = new Date();
    const localMin = (((now.getUTCHours() * 60 + now.getUTCMinutes() + TZ) % 1440) + 1440) % 1440;
    const h = localMin / 60;
    const prayersElapsed =
      h >= 20 ? 5 : h >= 18.5 ? 4 : h >= 16 ? 3 : h >= 12.5 ? 2 : h >= 5 ? 1 : 0;
    expect(me.salatToday).toBe(
      Math.min(prayersElapsed, Math.round(5 * Math.min(1, me.score / 100)))
    );
    expect(me.fastedToday).toBe(true); // zikr goal met
    expect(me).not.toHaveProperty('excused');
    expect(me).not.toHaveProperty('excusedToday');

    // A non-excused user with identical zikr gets the NORMAL formula
    await request(app).post(`/api/auth/verify`).send({ idToken: tokenZ });
    await asZ(request(app).post(`/api/zikr/increment/batch`)).send({
      increments: [
        { zikrType: 'SubhanAllah', amount: 80 },
        { zikrType: 'Astaghfirullah', amount: 40 },
      ],
      timezoneOffset: TZ,
      today: TODAY,
    });
    const sumZ = await asZ(
      request(app).get(`/api/social/summary?today=${TODAY}&timezoneOffset=${TZ}`)
    );
    const zaid = sumZ.body.leaderboard.find((f) => f.isMe);
    // zikr goal met 15 + istighfar extra 5 + steadiness 1; salat/fast/quran all 0
    expect(zaid.score).toBe(21);
  });

  test('all-time Noor uses the excused formula on cycle days', async () => {
    const noor = await asM(
      request(app).get(`/api/social/noor?today=${TODAY}&timezoneOffset=${TZ}`)
    );
    expect(noor.status).toBe(200);
    expect(noor.body.today).toBe(51);
    // Same formula for every day, so with one active day all-time equals today
    expect(noor.body.allTime).toBe(51);
  });

  test('end cycle; ending again rejected; end before start rejected', async () => {
    const bad = await asM(request(app).post(`/api/cycle/end`)).send({ date: shift(TODAY, -10) });
    expect(bad.status).toBe(400);

    const ended = await asM(request(app).post(`/api/cycle/end`)).send({ date: TODAY });
    expect(ended.status).toBe(200);
    expect(ended.body.log.endDate).toBe(TODAY);

    const again = await asM(request(app).post(`/api/cycle/end`)).send({ date: TODAY });
    expect(again.status).toBe(400);

    const sum = await asM(request(app).get(`/api/cycle/summary?today=${shift(TODAY, 1)}`));
    expect(sum.body.active).toBeNull();
    expect(sum.body.logs).toHaveLength(1);
  });

  test('nifas uses the 40-day maximum', async () => {
    const started = await asM(request(app).post(`/api/cycle/start`)).send({
      date: shift(TODAY, 2), // after the ended hayd (no overlap)
      type: 'nifas',
    });
    expect(started.status).toBe(200);
    const sum = await asM(request(app).get(`/api/cycle/summary?today=${shift(TODAY, 3)}`));
    expect(sum.body.active.type).toBe('nifas');
    expect(sum.body.active.maxDays).toBe(40);
    await asM(request(app).post(`/api/cycle/end`)).send({ date: shift(TODAY, 4) });
  });

  test('past-cycle backfill: valid history accepted, overlaps and future rejected', async () => {
    const added = await asM(request(app).post(`/api/cycle/logs`)).send({
      startDate: shift(TODAY, -40),
      endDate: shift(TODAY, -34),
      type: 'hayd',
      today: TODAY,
    });
    expect(added.status).toBe(200);
    expect(added.body.log.endDate).toBe(shift(TODAY, -34));

    // Overlap with the episode just added → rejected
    const overlap = await asM(request(app).post(`/api/cycle/logs`)).send({
      startDate: shift(TODAY, -36),
      endDate: shift(TODAY, -30),
      type: 'hayd',
      today: TODAY,
    });
    expect(overlap.status).toBe(400);

    // Ending today or later → must use the live flow instead
    const future = await asM(request(app).post(`/api/cycle/logs`)).send({
      startDate: shift(TODAY, -2),
      endDate: TODAY,
      type: 'hayd',
      today: TODAY,
    });
    expect(future.status).toBe(400);

    // Prediction now learns from history (two starts → one gap)
    const sum = await asM(request(app).get(`/api/cycle/summary?today=${TODAY}`));
    expect(sum.body.prediction.basedOnCycles).toBeGreaterThanOrEqual(1);
  });

  test('day wellness note upserts and returns in summary', async () => {
    const put = await asM(request(app).put(`/api/cycle/day`)).send({
      date: TODAY,
      flow: 'medium',
      symptoms: ['cramps', 'fatigue'],
      moods: ['tired', 'low'],
    });
    expect(put.status).toBe(200);
    expect(put.body.day.flow).toBe('medium');
    expect(put.body.day.moods).toEqual(['tired', 'low']);

    // Partial update keeps unspecified fields; moods can hold several feelings
    await asM(request(app).put(`/api/cycle/day`)).send({ date: TODAY, moods: ['calm', 'happy'] });
    const sum = await asM(request(app).get(`/api/cycle/summary?today=${TODAY}`));
    const day = sum.body.days.find((d) => d.date === TODAY);
    expect(day.flow).toBe('medium');
    expect(day.symptoms).toEqual(['cramps', 'fatigue']);
    expect(day.moods).toEqual(['calm', 'happy']);

    // Invalid symptom rejected
    const bad = await asM(request(app).put(`/api/cycle/day`)).send({
      date: TODAY,
      symptoms: ['hangry'],
    });
    expect(bad.status).toBe(400);
  });

  test('garden of light checklist is server-synced (not just localStorage)', async () => {
    const put = await asM(request(app).put(`/api/cycle/day`)).send({
      date: TODAY,
      garden: ['dhikr', 'salawat'],
    });
    expect(put.status).toBe(200);
    expect(put.body.day.garden).toEqual(['dhikr', 'salawat']);

    // Persists across a fresh summary fetch — this is the whole point of
    // moving it server-side (survives a device switch / cache clear)
    const sum = await asM(request(app).get(`/api/cycle/summary?today=${TODAY}`));
    const day = sum.body.days.find((d) => d.date === TODAY);
    expect(day.garden).toEqual(['dhikr', 'salawat']);

    // Overwrite with a new set (toggle-off semantics — full replace, not merge)
    await asM(request(app).put(`/api/cycle/day`)).send({ date: TODAY, garden: ['dhikr'] });
    const sum2 = await asM(request(app).get(`/api/cycle/summary?today=${TODAY}`));
    expect(sum2.body.days.find((d) => d.date === TODAY).garden).toEqual(['dhikr']);

    // Unknown checklist id rejected
    const bad = await asM(request(app).put(`/api/cycle/day`)).send({
      date: TODAY,
      garden: ['not-a-real-item'],
    });
    expect(bad.status).toBe(400);
  });

  test("v4.9: edit a cycle's dates and REOPEN it without losing daily notes", async () => {
    const token = fakeJwt({ uid: 'aisha', email: 'aisha@test.dev', name: 'Aisha' });
    const as = (r) => r.set('Authorization', `Bearer ${token}`);
    await request(app).post(`/api/auth/verify`).send({ idToken: token });
    await as(request(app).patch(`/api/user/me`)).send({ gender: 'female' });

    // A completed episode with a daily note inside it
    const added = await as(request(app).post(`/api/cycle/logs`)).send({
      startDate: '2026-07-10',
      endDate: '2026-07-15',
      type: 'hayd',
      today: '2026-07-23',
    });
    expect(added.status).toBe(200);
    const logId = added.body.log._id;
    await as(request(app).put(`/api/cycle/day`)).send({
      date: '2026-07-12',
      flow: 'medium',
      symptoms: ['cramps'],
    });

    // Edit the end date
    const edit = await as(request(app).patch(`/api/cycle/logs/${logId}`)).send({
      endDate: '2026-07-16',
    });
    expect(edit.status).toBe(200);
    expect(edit.body.log.endDate).toBe('2026-07-16');

    // REOPEN — endDate null; the daily note survives
    const reopen = await as(request(app).patch(`/api/cycle/logs/${logId}`)).send({ endDate: null });
    expect(reopen.status).toBe(200);
    expect(reopen.body.log.endDate).toBeNull();

    const sum = await as(request(app).get(`/api/cycle/summary?today=2026-07-23`));
    expect(sum.body.active).toBeTruthy();
    expect(sum.body.days.some((d) => d.date === '2026-07-12' && d.flow === 'medium')).toBe(true);

    // Overlap and bad edits are rejected
    const bad = await as(request(app).patch(`/api/cycle/logs/${logId}`)).send({
      startDate: '2026-07-20',
      endDate: '2026-07-18',
    });
    expect(bad.status).toBe(400);
  });

  test('delete all wipes cycle data', async () => {
    const del = await asM(request(app).delete(`/api/cycle/all`));
    expect(del.status).toBe(200);
    const sum = await asM(request(app).get(`/api/cycle/summary?today=${TODAY}`));
    expect(sum.body.logs).toHaveLength(0);
    expect(sum.body.active).toBeNull();
  });
});
