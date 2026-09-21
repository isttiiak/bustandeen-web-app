import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import User from '../src/models/User.js';
import CycleLog from '../src/models/CycleLog.js';
import ZikrDaily from '../src/models/ZikrDaily.js';
import ZikrGoal from '../src/models/ZikrGoal.js';
import QuranLog from '../src/models/QuranLog.js';
import QuranProfile from '../src/models/QuranProfile.js';
import NaseehPlan from '../src/models/NaseehPlan.js';
import * as planService from '../src/services/naseehPlan.service.js';

// Weekly plan: sized from the user's own last four weeks, rest days neutral,
// paused while today is a rest day, and no AI anywhere.

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};
const iso = (offset) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};
const TODAY = iso(0);
const WEEK_START = planService.weekStartOf(TODAY);
const opts = { today: TODAY, timezoneOffset: 0 };

let mongo;
beforeAll(async () => {
  process.env.DEV_AUTH_BYPASS = '1';
  delete process.env.GROQ_API_KEY;
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_naseeh_plan' });
});
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect().catch(() => {});
  }
  if (mongo) await mongo.stop();
});

const seedUser = (uid, aiEnabled = true) =>
  User.create({ uid, email: `${uid}@test.dev`, aiEnabled });
/** Dhikr on chosen days back from today (count each). */
const seedZikr = (uid, daysBack, count) =>
  Promise.all(
    daysBack.map((b) =>
      ZikrDaily.create({
        userId: uid,
        zikrType: 'SubhanAllah',
        date: new Date(`${iso(-b)}T00:00:00Z`),
        count,
      })
    )
  );

describe('plan sizing', () => {
  test('a brand-new account has too little history, and nothing is asked of the user', async () => {
    const uid = 'plan-new';
    await seedUser(uid);
    const plan = await planService.getPlan(uid, opts);
    expect(plan.status).toBe('not-enough-data');
    expect(plan.targets).toEqual([]);
  });

  test('rest days do not count towards having enough history', async () => {
    const uid = 'plan-mostly-rest';
    await seedUser(uid);
    await seedZikr(uid, [26], 40); // tracking started 26 days ago
    await CycleLog.create({ userId: uid, startDate: iso(-25), endDate: iso(-4) });
    const plan = await planService.getPlan(uid, opts); // only ~5 days count
    expect(plan.status).toBe('not-enough-data');
  });

  test('a suggested plan is sized to what the user actually did and has at most two targets', async () => {
    const uid = 'plan-ready';
    await seedUser(uid);
    await seedZikr(uid, [1, 3, 5, 8, 10, 12, 15, 19, 22, 26], 40); // 10 days of about 40, goal is 100
    const plan = await planService.getPlan(uid, opts);
    expect(plan.status).toBe('ready');
    expect(plan.targets.length).toBeGreaterThan(0);
    expect(plan.targets.length).toBeLessThanOrEqual(2);
    const zikr = plan.targets.find((t) => t.kind === 'zikr');
    expect(zikr.dailyAmount).toBe(40); // her own typical day, not the fixed 100
    expect(zikr.daysTarget).toBeGreaterThanOrEqual(1);
    expect(zikr.daysTarget).toBeLessThanOrEqual(7);
    expect(zikr.reason).toMatch(/counted days/);
    expect(plan.headline).not.toMatch(/rest|cycle|period/i);
  });

  test('a user already at goal everywhere gets "steady", not busywork', async () => {
    const uid = 'plan-steady';
    await seedUser(uid);
    await ZikrGoal.create({ userId: uid, dailyTarget: 10 });
    await seedZikr(
      uid,
      Array.from({ length: 28 }, (_, i) => i),
      50
    );
    await QuranProfile.create({ userId: uid, dailyGoalAyat: 5 });
    await Promise.all(
      Array.from({ length: 28 }, (_, i) =>
        QuranLog.create({ userId: uid, date: iso(-i), pages: 0, ayat: 10 })
      )
    );
    const plan = await planService.getPlan(uid, opts);
    // Dhikr and Quran are steady; salat has too little tracked history to judge.
    expect(plan.status).toBe('steady');
    expect(plan.targets).toEqual([]);
  });
});

describe('accepting a plan', () => {
  test('writes the daily bars to the existing goal fields and shows progress', async () => {
    const uid = 'plan-accept';
    await seedUser(uid);
    await seedZikr(uid, [1, 3, 5, 8, 10, 12, 15, 19, 22, 26], 40);
    await seedZikr(uid, [0], 60); // today counts towards this week's progress

    const accepted = await planService.acceptPlan(uid, opts);
    expect(accepted.status).toBe('accepted');
    expect((await ZikrGoal.findOne({ userId: uid })).dailyTarget).toBe(40);
    const zikr = accepted.targets.find((t) => t.kind === 'zikr');
    expect(zikr.done).toBe(1); // today's 60 meets the 40 bar
    expect(zikr.daysLeft).toBeGreaterThanOrEqual(1);
    const stored = await NaseehPlan.findOne({ userId: uid, weekStart: WEEK_START });
    expect(stored.accepted).toBe(true);
  });

  test('the user can adjust a target before accepting; limits are enforced', async () => {
    const uid = 'plan-adjust';
    await seedUser(uid);
    await seedZikr(uid, [1, 3, 5, 8, 10, 12, 15, 19, 22, 26], 40);
    const plan = await planService.acceptPlan(uid, {
      ...opts,
      adjust: [{ kind: 'zikr', dailyAmount: 55, daysTarget: 2 }],
    });
    const zikr = plan.targets.find((t) => t.kind === 'zikr');
    expect(zikr.dailyAmount).toBe(55);
    expect(zikr.daysTarget).toBe(2);
    expect((await ZikrGoal.findOne({ userId: uid })).dailyTarget).toBe(55);
  });
});

describe('rest days pause the plan', () => {
  test('while today is a rest day: no plan is shown and none can be accepted', async () => {
    const uid = 'plan-resting';
    await seedUser(uid);
    await seedZikr(uid, [1, 3, 5, 8, 10, 12, 15, 19, 22, 26], 40);
    await CycleLog.create({ userId: uid, startDate: iso(-1), endDate: null });

    const plan = await planService.getPlan(uid, opts);
    expect(plan.status).toBe('paused');
    expect(plan.targets).toEqual([]);
    await expect(planService.acceptPlan(uid, opts)).rejects.toMatchObject({ statusCode: 409 });
    expect(await ZikrGoal.findOne({ userId: uid })).toBeNull(); // nothing was written
  });

  test('an accepted plan pauses too, and comes back when the rest days end', async () => {
    const uid = 'plan-resume';
    await seedUser(uid);
    await seedZikr(uid, [1, 3, 5, 8, 10, 12, 15, 19, 22, 26], 40);
    await planService.acceptPlan(uid, opts);
    const cycle = await CycleLog.create({ userId: uid, startDate: TODAY, endDate: null });
    expect((await planService.getPlan(uid, opts)).status).toBe('paused');
    await CycleLog.deleteOne({ _id: cycle._id });
    expect((await planService.getPlan(uid, opts)).status).toBe('accepted');
  });

  test('rest days later this week lower the target instead of making it unreachable', async () => {
    const uid = 'plan-shorter-week';
    await seedUser(uid);
    await seedZikr(uid, [1, 3, 5, 8, 10, 12, 15, 19, 22, 26], 40);
    const weekEnd = new Date(`${WEEK_START}T00:00:00Z`);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    const tomorrow = iso(1);
    if (tomorrow <= weekEnd.toISOString().slice(0, 10)) {
      await CycleLog.create({
        userId: uid,
        startDate: tomorrow,
        endDate: weekEnd.toISOString().slice(0, 10),
      });
    }
    const plan = await planService.getPlan(uid, opts);
    expect(plan.status).toBe('ready');
    const possible = plan.targets[0].daysLeft + plan.targets[0].done;
    for (const t of plan.targets) {
      expect(t.daysTarget).toBeLessThanOrEqual(Math.max(1, possible));
    }
  });

  test('rest days are left out of the four-week baseline, so they do not shrink the amount', async () => {
    const uid = 'plan-baseline';
    await seedUser(uid);
    // 10 real dhikr days of 40 and 8 rest days with nothing. Amount must stay 40.
    await seedZikr(uid, [1, 3, 5, 8, 10, 12, 15, 19, 22, 26], 40);
    await CycleLog.create({ userId: uid, startDate: iso(-18), endDate: iso(-11) });
    const plan = await planService.getPlan(uid, opts);
    const zikr = plan.targets.find((t) => t.kind === 'zikr');
    expect(zikr.dailyAmount).toBe(40);
  });
});

describe('routes', () => {
  const on = fakeJwt({ uid: 'plan-route-on', email: 'plan-route-on@test.dev', name: 'On' });
  const off = fakeJwt({ uid: 'plan-route-off', email: 'plan-route-off@test.dev', name: 'Off' });
  const as = (r, tok) => r.set('Authorization', `Bearer ${tok}`);

  beforeAll(async () => {
    await seedUser('plan-route-on');
    await seedUser('plan-route-off', false);
  });

  test('both routes need auth', async () => {
    expect((await request(app).get('/api/naseeh/plan')).status).toBe(401);
    expect((await request(app).post('/api/naseeh/plan/accept').send({})).status).toBe(401);
  });

  test('Naseeh switched off returns 403', async () => {
    expect((await as(request(app).get('/api/naseeh/plan'), off)).status).toBe(403);
    expect((await as(request(app).post('/api/naseeh/plan/accept'), off).send({})).status).toBe(403);
  });

  test('GET returns a plan and makes no AI request', async () => {
    global.fetch = () => {
      throw new Error('the weekly plan must never call an AI');
    };
    const res = await as(request(app).get(`/api/naseeh/plan?today=${TODAY}&timezoneOffset=0`), on);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('not-enough-data');
    expect(res.body.weekStart).toBe(WEEK_START);
  });

  test('accept validates its body', async () => {
    const bad = (body) => as(request(app).post('/api/naseeh/plan/accept'), on).send(body);
    expect((await bad({ targets: [{ kind: 'sleep' }] })).status).toBe(400);
    expect((await bad({ targets: [{ kind: 'zikr', daysTarget: 9 }] })).status).toBe(400);
    expect((await bad({ targets: [{ kind: 'zikr', dailyAmount: 0 }] })).status).toBe(400);
    expect((await bad({ today: 'tomorrow' })).status).toBe(400);
  });
});
