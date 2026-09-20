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

describe('Zikr API', () => {
  beforeAll(async () => {
    process.env.DEV_AUTH_BYPASS = '1';
    mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri();
    await mongoose.connect(uri, { dbName: 'ihsan_test' });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
    if (mongo) await mongo.stop();
  });

  test('summary requires auth', async () => {
    const res = await request(app).get(`/api/zikr/summary`);
    expect(res.status).toBe(401);
  });

  test('increment updates lifetime totals and creates defaults', async () => {
    const token = fakeJwt({ uid: 'u1', email: 'u1@test.dev', name: 'U1' });

    // Upsert user via verify
    await request(app).post(`/api/auth/verify`).send({ idToken: token });

    // Initial summary
    let sum = await request(app).get(`/api/zikr/summary`).set('Authorization', `Bearer ${token}`);
    expect(sum.status).toBe(200);
    expect(sum.body.totalCount).toBe(0);

    // Increment two types
    await request(app)
      .post(`/api/zikr/increment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ zikrType: 'SubhanAllah', amount: 3 });

    await request(app)
      .post(`/api/zikr/increment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ zikrType: 'Alhamdulillah', amount: 2 });

    // Check summary
    sum = await request(app).get(`/api/zikr/summary`).set('Authorization', `Bearer ${token}`);
    expect(sum.status).toBe(200);
    expect(sum.body.totalCount).toBe(5);
    const map = Object.fromEntries(sum.body.perType.map((t) => [t.zikrType, t.total]));
    expect(map['SubhanAllah']).toBe(3);
    expect(map['Alhamdulillah']).toBe(2);
  });

  test('batch increment updates multiple types at once', async () => {
    const token = fakeJwt({ uid: 'u2', email: 'u2@test.dev', name: 'U2' });

    await request(app).post(`/api/auth/verify`).send({ idToken: token });

    const res = await request(app)
      .post(`/api/zikr/increment/batch`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        increments: [
          { zikrType: 'Allahu Akbar', amount: 10 },
          { zikrType: 'La ilaha illallah', amount: 7 },
          { zikrType: 'Allahu Akbar', amount: 5 },
        ],
      });
    expect(res.status).toBe(200);

    const sum = await request(app).get(`/api/zikr/summary`).set('Authorization', `Bearer ${token}`);
    expect(sum.status).toBe(200);
    const map = Object.fromEntries(sum.body.perType.map((t) => [t.zikrType, t.total]));
    expect(map['Allahu Akbar']).toBe(15);
    expect(map['La ilaha illallah']).toBe(7);
    expect(sum.body.totalCount).toBe(22);
  });

  test('negative amounts (minus button) decrement DB counts, clamped at 0', async () => {
    const token = fakeJwt({ uid: 'u-dec', email: 'dec@test.dev', name: 'Dec' });
    await request(app).post(`/api/auth/verify`).send({ idToken: token });

    // Count 10, then decrement 3 → 7
    await request(app)
      .post(`/api/zikr/increment/batch`)
      .set('Authorization', `Bearer ${token}`)
      .send({ increments: [{ zikrType: 'SubhanAllah', amount: 10 }], timezoneOffset: 360 });
    const dec = await request(app)
      .post(`/api/zikr/increment/batch`)
      .set('Authorization', `Bearer ${token}`)
      .send({ increments: [{ zikrType: 'SubhanAllah', amount: -3 }], timezoneOffset: 360 });
    expect(dec.status).toBe(200);

    let sum = await request(app)
      .get(`/api/zikr/summary?timezoneOffset=360`)
      .set('Authorization', `Bearer ${token}`);
    expect(sum.body.totalCount).toBe(7);
    expect(sum.body.today.total).toBe(7);
    expect(sum.body.today.perType['SubhanAllah']).toBe(7);

    // Over-decrement (-100) clamps the day bucket at 0 and only subtracts
    // what was actually there from the lifetime total
    await request(app)
      .post(`/api/zikr/increment/batch`)
      .set('Authorization', `Bearer ${token}`)
      .send({ increments: [{ zikrType: 'SubhanAllah', amount: -100 }], timezoneOffset: 360 });
    sum = await request(app)
      .get(`/api/zikr/summary?timezoneOffset=360`)
      .set('Authorization', `Bearer ${token}`);
    expect(sum.body.today.total).toBe(0);
    expect(sum.body.totalCount).toBe(0);

    // amount 0 is rejected by validation
    const zero = await request(app)
      .post(`/api/zikr/increment/batch`)
      .set('Authorization', `Bearer ${token}`)
      .send({ increments: [{ zikrType: 'SubhanAllah', amount: 0 }] });
    expect(zero.status).toBe(400);
  });

  test('summary honors an explicit ?today= tracking day (Fajr boundary)', async () => {
    const token = fakeJwt({ uid: 'u-fajr', email: 'fajr@test.dev', name: 'Fajr' });
    await request(app).post(`/api/auth/verify`).send({ idToken: token });

    // Log 5 counts anchored to YESTERDAY's tracking day (midday ts)
    const tz = 360;
    const yester = new Date(Date.now() + tz * 60 * 1000 - 86_400_000);
    const yesterStr = yester.toISOString().slice(0, 10);
    const middayTs = new Date(`${yesterStr}T12:00:00.000Z`).getTime() - tz * 60 * 1000;
    await request(app)
      .post(`/api/zikr/increment/batch`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        increments: [{ zikrType: 'SubhanAllah', amount: 5, ts: middayTs }],
        timezoneOffset: tz,
        today: yesterStr,
      });

    // Asking for that tracking day returns its bucket; the real "today" is empty
    const asYester = await request(app)
      .get(`/api/zikr/summary?timezoneOffset=${tz}&today=${yesterStr}`)
      .set('Authorization', `Bearer ${token}`);
    expect(asYester.body.today.total).toBe(5);

    const todayStr = new Date(Date.now() + tz * 60 * 1000).toISOString().slice(0, 10);
    const asToday = await request(app)
      .get(`/api/zikr/summary?timezoneOffset=${tz}&today=${todayStr}`)
      .set('Authorization', `Bearer ${token}`);
    expect(asToday.body.today.total).toBe(0);
  });

  test('types endpoint returns defaults and custom types de-duplicated (case-insensitive)', async () => {
    const token = fakeJwt({ uid: 'u3', email: 'u3@test.dev', name: 'U3' });

    await request(app).post(`/api/auth/verify`).send({ idToken: token });

    // Add custom type
    await request(app)
      .post(`/api/zikr/types`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Morning Zikr' });

    // Duplicate with different case should be ignored
    await request(app)
      .post(`/api/zikr/types`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'morning zikr' });

    const types = await request(app).get(`/api/zikr/types`).set('Authorization', `Bearer ${token}`);
    expect(types.status).toBe(200);
    const names = types.body.types.map((t) => t.name || t);
    expect(names).toContain('Morning Zikr');
    expect(names.filter((n) => n.toLowerCase() === 'morning zikr').length).toBe(1);
  });

  test('rename carries lifetime totals and daily buckets to the new name', async () => {
    const token = fakeJwt({ uid: 'u4', email: 'u4@test.dev', name: 'U4' });
    await request(app).post(`/api/auth/verify`).send({ idToken: token });

    await request(app)
      .post(`/api/zikr/types`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Ya Muizzu' });

    // Count 7 under the old name
    await request(app)
      .post(`/api/zikr/increment/batch`)
      .set('Authorization', `Bearer ${token}`)
      .send({ increments: [{ zikrType: 'Ya Muizzu', amount: 7 }], timezoneOffset: 0 });

    // Rename → history must follow
    const renamed = await request(app)
      .patch(`/api/zikr/types/rename`)
      .set('Authorization', `Bearer ${token}`)
      .send({ oldName: 'Ya Muizzu', newName: "Ya Mu'izz" });
    expect(renamed.status).toBe(200);

    const summary = await request(app)
      .get(`/api/zikr/summary?timezoneOffset=0`)
      .set('Authorization', `Bearer ${token}`);
    const perType = Object.fromEntries(summary.body.perType.map((p) => [p.zikrType, p.total]));
    expect(perType["Ya Mu'izz"]).toBe(7);
    expect(perType['Ya Muizzu']).toBeUndefined();
    // Today's bucket moved too
    expect(summary.body.today.perType["Ya Mu'izz"] ?? 0).toBe(7);

    // Renaming to an existing name is rejected
    const clash = await request(app)
      .patch(`/api/zikr/types/rename`)
      .set('Authorization', `Bearer ${token}`)
      .send({ oldName: "Ya Mu'izz", newName: 'SubhanAllah' });
    expect(clash.status).toBe(409);

    // Renaming something not in the list is a 404
    const missing = await request(app)
      .patch(`/api/zikr/types/rename`)
      .set('Authorization', `Bearer ${token}`)
      .send({ oldName: 'Nope', newName: 'Still Nope' });
    expect(missing.status).toBe(404);
  });

  describe('Zikr streak (derived)', () => {
    const token = fakeJwt({ uid: 's1', email: 's1@test.dev', name: 'S1' });
    const auth = (r) => r.set('Authorization', `Bearer ${token}`);
    const DAY = 24 * 60 * 60 * 1000;

    test('backfilling a missed day reconnects the streak', async () => {
      await request(app).post(`/api/auth/verify`).send({ idToken: token });
      await auth(request(app).post(`/api/analytics/goal`)).send({ dailyTarget: 10 });

      // Meet the goal today only → streak 1
      await auth(request(app).post(`/api/zikr/increment/batch`)).send({
        increments: [{ zikrType: 'SubhanAllah', amount: 10 }],
        timezoneOffset: 360,
      });
      let res = await auth(request(app).get(`/api/analytics/streak?timezoneOffset=360`));
      expect(res.body.streak.currentStreak).toBe(1);
      expect(res.body.streak.state).toBe('active');

      // Backfill the day BEFORE yesterday (2 days ago) → gap at yesterday is a
      // single grace day, so the chain connects: streak = 2
      await auth(request(app).post(`/api/zikr/increment/batch`)).send({
        increments: [{ zikrType: 'SubhanAllah', amount: 10, ts: Date.now() - 2 * DAY }],
        timezoneOffset: 360,
      });
      res = await auth(request(app).get(`/api/analytics/streak?timezoneOffset=360`));
      expect(res.body.streak.currentStreak).toBe(2);

      // Now backfill yesterday too → no gaps at all: streak = 3
      await auth(request(app).post(`/api/zikr/increment/batch`)).send({
        increments: [{ zikrType: 'SubhanAllah', amount: 10, ts: Date.now() - 1 * DAY }],
        timezoneOffset: 360,
      });
      res = await auth(request(app).get(`/api/analytics/streak?timezoneOffset=360`));
      expect(res.body.streak.currentStreak).toBe(3);
    });

    test('ts older than 2 days is rejected', async () => {
      const res = await auth(request(app).post(`/api/zikr/increment/batch`)).send({
        increments: [{ zikrType: 'SubhanAllah', amount: 5, ts: Date.now() - 5 * DAY }],
        timezoneOffset: 360,
      });
      expect(res.status).toBe(400);
    });

    test('analytics chart days carry streak statuses', async () => {
      const res = await auth(request(app).get(`/api/analytics?days=7&timezoneOffset=360`));
      expect(res.status).toBe(200);
      const statuses = res.body.chartData.map((d) => d.status);
      expect(statuses.every((s) => ['met', 'pending', 'grace', 'missed'].includes(s))).toBe(true);
      // today is met → last day status 'met'
      expect(statuses[statuses.length - 1]).toBe('met');
    });
  });

  describe('Zikr time-of-day & sessions', () => {
    const tz = 360;

    test('time-of-day buckets a tap by its real local hour, not the day-bucket ts', async () => {
      const token = fakeJwt({ uid: 'tod1', email: 'tod1@test.dev', name: 'ToD' });
      await request(app).post(`/api/auth/verify`).send({ idToken: token });

      const todayStr = new Date(Date.now() + tz * 60 * 1000).toISOString().slice(0, 10);
      const localNoonMs = new Date(`${todayStr}T12:00:00.000Z`).getTime() - tz * 60 * 1000;

      await request(app)
        .post(`/api/zikr/increment/batch`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          increments: [{ zikrType: 'SubhanAllah', amount: 9, realTs: localNoonMs }],
          timezoneOffset: tz,
        });

      const res = await request(app)
        .get(`/api/zikr/time-of-day?timezoneOffset=${tz}&days=7`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.hours).toHaveLength(24);
      expect(res.body.hours[12].total).toBe(9);
      expect(res.body.hours.filter((h) => h.hour !== 12).every((h) => h.total === 0)).toBe(true);
    });

    test('sessions cluster taps with gaps under 20 minutes, split on longer gaps', async () => {
      const token = fakeJwt({ uid: 'sess1', email: 'sess1@test.dev', name: 'Sess' });
      await request(app).post(`/api/auth/verify`).send({ idToken: token });

      const todayStr = new Date(Date.now() + tz * 60 * 1000).toISOString().slice(0, 10);
      const localNoonMs = new Date(`${todayStr}T12:00:00.000Z`).getTime() - tz * 60 * 1000;

      await request(app)
        .post(`/api/zikr/increment/batch`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          increments: [
            { zikrType: 'SubhanAllah', amount: 33, realTs: localNoonMs },
            { zikrType: 'Alhamdulillah', amount: 33, realTs: localNoonMs + 2 * 60 * 1000 },
            { zikrType: 'Allahu Akbar', amount: 34, realTs: localNoonMs + 45 * 60 * 1000 },
          ],
          timezoneOffset: tz,
        });

      const res = await request(app)
        .get(`/api/zikr/sessions?date=${todayStr}&timezoneOffset=${tz}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.sessions).toHaveLength(2);
      expect(res.body.sessions[0].total).toBe(66);
      expect(res.body.sessions[0].perType['SubhanAllah']).toBe(33);
      expect(res.body.sessions[0].perType['Alhamdulillah']).toBe(33);
      expect(res.body.sessions[1].total).toBe(34);
      expect(res.body.sessions[1].perType['Allahu Akbar']).toBe(34);
    });

    test('manual and untimed counts never become timed sessions or time-of-day data', async () => {
      const token = fakeJwt({ uid: 'sess3', email: 'sess3@test.dev', name: 'Sess3' });
      await request(app).post(`/api/auth/verify`).send({ idToken: token });

      const todayStr = new Date(Date.now() + tz * 60 * 1000).toISOString().slice(0, 10);
      const localNoonMs = new Date(`${todayStr}T12:00:00.000Z`).getTime() - tz * 60 * 1000;
      const evening = localNoonMs + 6 * 60 * 60 * 1000;

      await request(app)
        .post(`/api/zikr/increment/batch`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          increments: [
            // 40 tapped in a run that began 3 minutes earlier
            { zikrType: 'SubhanAllah', amount: 40, realTs: evening, startTs: evening - 3 * 60_000 },
            // salat-tracker tasbih: 33 of these 73 were added automatically
            { zikrType: 'Alhamdulillah', amount: 73, realTs: evening, untimedAmount: 33 },
            // typed in afterwards via "Log missed counts"
            { zikrType: 'Allahu Akbar', amount: 100, ts: localNoonMs, manual: true },
          ],
          timezoneOffset: tz,
        });

      const res = await request(app)
        .get(`/api/zikr/sessions?date=${todayStr}&timezoneOffset=${tz}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const timed = res.body.sessions.filter((s) => !s.manual);
      const manual = res.body.sessions.filter((s) => s.manual);
      expect(timed).toHaveLength(1);
      // 40 + (73 - 33): the auto-added tasbih is not part of the session
      expect(timed[0].total).toBe(80);
      expect(timed[0].perType['Alhamdulillah']).toBe(40);
      // the session starts when the tapping really began, not at the flush
      expect(new Date(timed[0].end) - new Date(timed[0].start)).toBe(3 * 60_000);
      expect(manual).toHaveLength(1);
      expect(manual[0].perType['Allahu Akbar']).toBe(100);

      // Everything still counts toward the day's totals...
      const summary = await request(app)
        .get(`/api/zikr/summary`)
        .set('Authorization', `Bearer ${token}`);
      const total = (summary.body.perType ?? []).reduce((n, t) => n + t.total, 0);
      expect(total).toBe(40 + 73 + 100);

      // ...but the manual 100 doesn't invent a noon spike in time-of-day.
      const tod = await request(app)
        .get(`/api/zikr/time-of-day?timezoneOffset=${tz}&days=7`)
        .set('Authorization', `Bearer ${token}`);
      expect(tod.body.hours.reduce((n, h) => n + h.total, 0)).toBe(80);
    });

    test('sessions endpoint requires a date query param', async () => {
      const token = fakeJwt({ uid: 'sess2', email: 'sess2@test.dev', name: 'Sess2' });
      await request(app).post(`/api/auth/verify`).send({ idToken: token });

      const res = await request(app)
        .get(`/api/zikr/sessions`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
    });
  });
});
