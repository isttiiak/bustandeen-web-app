import type { AuthUser, AnalyticsResponse } from '../types/api.js';

function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function seed(i: number): number {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function seedInt(i: number, min: number, max: number): number {
  return Math.floor(min + seed(i) * (max - min + 1));
}

const DEMO_USERS: Record<string, AuthUser> = {
  male: { uid: 'demo-001', email: 'demo@bustandeen.com', displayName: 'Abdullah', gender: 'male' },
  female: {
    uid: 'demo-001',
    email: 'demo@bustandeen.com',
    displayName: 'Khadijah',
    gender: 'female',
  },
};

export function getDemoUser(gender: string): AuthUser {
  return DEMO_USERS[gender] ?? DEMO_USERS.male;
}

function buildChartData(days: number) {
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const base = seedInt(i + 100, 200, 1400);
    data.push({
      date: dateStr(i),
      total: base,
      breakdown: {
        SubhanAllah: Math.floor(base * 0.33),
        Alhamdulillah: Math.floor(base * 0.33),
        'Allahu Akbar': Math.floor(base * 0.34),
      },
      status: (base > 500 ? 'met' : 'pending') as 'met' | 'pending',
    });
  }
  return data;
}

function buildZikrAnalytics(days: number): AnalyticsResponse {
  const chartData = buildChartData(days);
  const total = chartData.reduce((s, d) => s + d.total, 0);
  const todayTotal = chartData[chartData.length - 1]?.total ?? 0;
  return {
    ok: true,
    period: { days, startDate: dateStr(days - 1), endDate: dateStr(0) },
    chartData,
    stats: { average: Math.round(total / days), maxDay: dateStr(3), maxCount: 1400, total },
    today: {
      total: todayTotal,
      goalMet: todayTotal >= 500,
      perType: [
        { zikrType: 'SubhanAllah', total: Math.floor(todayTotal * 0.33) },
        { zikrType: 'Alhamdulillah', total: Math.floor(todayTotal * 0.33) },
        { zikrType: 'Allahu Akbar', total: Math.floor(todayTotal * 0.34) },
      ],
    },
    goal: { dailyTarget: 500, isActive: true, graceDays: 1 },
    streak: { currentStreak: 12, longestStreak: 21, state: 'active' },
    allTime: { totalCount: 42300, bestDay: { date: dateStr(14), count: 2180 } },
    perType: [
      { zikrType: 'SubhanAllah', total: 14100 },
      { zikrType: 'Alhamdulillah', total: 14100 },
      { zikrType: 'Allahu Akbar', total: 14100 },
    ],
  };
}

function buildSalatLog() {
  return {
    ok: true,
    log: {
      date: dateStr(0),
      prayers: {
        fajr: { status: 'completed', at: 'mosque', tasbeeh: true },
        dhuhr: { status: 'completed', at: 'home' },
        // Left unmarked so Home shows the one-tap Kaza once ʿAṣr's time is over.
        asr: { status: 'pending' },
        maghrib: { status: 'completed', at: 'mosque' },
        isha: { status: 'pending' },
      },
      nafl: { completed: true, types: ['tahajjud', 'duha'], rakat: 8 },
    },
  };
}

function buildCalendarData(days: number) {
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const v = seedInt(i + 200, 0, 6);
    data.push({ date: dateStr(i), completed: Math.min(v, 5), total: 5, logged: true });
  }
  return data;
}

function buildSalatAnalytics(days: number) {
  const cal = buildCalendarData(days);
  const logged = cal.filter((c) => c.completed > 0);
  const totalCompleted = cal.reduce((s, c) => s + c.completed, 0);
  return {
    ok: true,
    periodDays: days,
    totalDays: logged.length,
    totalPossiblePrayers: logged.length * 5,
    completedCount: Math.floor(totalCompleted * 0.85),
    kazaCount: Math.floor(totalCompleted * 0.1),
    missedCount: logged.length * 5 - totalCompleted,
    prayedTotal: totalCompleted,
    mosqueCount: Math.floor(totalCompleted * 0.25),
    jamaatCount: Math.floor(totalCompleted * 0.35),
    homeCount: Math.floor(totalCompleted * 0.4),
    tasbeehCount: Math.floor(totalCompleted * 0.55),
    naflDays: Math.floor(logged.length * 0.4),
    completionRate:
      logged.length > 0 ? Math.round((totalCompleted / (logged.length * 5)) * 100) : 0,
    currentStreak: 8,
    bestStreak: 23,
    perPrayer: {
      fajr: {
        completed: Math.floor(logged.length * 0.7),
        kaza: Math.floor(logged.length * 0.1),
        missed: Math.floor(logged.length * 0.2),
        pending: 0,
        mosque: Math.floor(logged.length * 0.4),
        jamat: Math.floor(logged.length * 0.5),
        tasbeeh: Math.floor(logged.length * 0.5),
      },
      dhuhr: {
        completed: Math.floor(logged.length * 0.8),
        kaza: Math.floor(logged.length * 0.1),
        missed: Math.floor(logged.length * 0.1),
        pending: 0,
        mosque: Math.floor(logged.length * 0.2),
        jamat: Math.floor(logged.length * 0.3),
        tasbeeh: Math.floor(logged.length * 0.4),
      },
      asr: {
        completed: Math.floor(logged.length * 0.75),
        kaza: Math.floor(logged.length * 0.15),
        missed: Math.floor(logged.length * 0.1),
        pending: 0,
        mosque: Math.floor(logged.length * 0.15),
        jamat: Math.floor(logged.length * 0.25),
        tasbeeh: Math.floor(logged.length * 0.45),
      },
      maghrib: {
        completed: Math.floor(logged.length * 0.85),
        kaza: Math.floor(logged.length * 0.05),
        missed: Math.floor(logged.length * 0.1),
        pending: 0,
        mosque: Math.floor(logged.length * 0.35),
        jamat: Math.floor(logged.length * 0.45),
        tasbeeh: Math.floor(logged.length * 0.6),
      },
      isha: {
        completed: Math.floor(logged.length * 0.7),
        kaza: Math.floor(logged.length * 0.15),
        missed: Math.floor(logged.length * 0.15),
        pending: 0,
        mosque: Math.floor(logged.length * 0.3),
        jamat: Math.floor(logged.length * 0.4),
        tasbeeh: Math.floor(logged.length * 0.5),
      },
    },
    last7Days: cal.slice(-7),
    calendarData: cal,
    weeklyMosqueTrend: Array.from({ length: 4 }, (_, i) => {
      const prayedCount = 30 + seedInt(i + 950, 0, 5);
      const mosqueCount = Math.round(prayedCount * (0.2 + seed(i + 900) * 0.4));
      return {
        weekStart: dateStr(27 - i * 7),
        weekEnd: dateStr(21 - i * 7),
        mosqueCount,
        prayedCount,
        rate: Math.round((mosqueCount / prayedCount) * 100),
      };
    }).reverse(),
    fridayCount: Math.floor(days / 7),
    jumuahAttendedCount: Math.max(0, Math.floor(days / 7) - 1),
    byWeekday: Object.fromEntries(
      Array.from({ length: 7 }, (_, wd) => {
        const total = Math.round((logged.length / 7) * 5);
        const missed = seedInt(wd + 960, 0, 3);
        const kaza = seedInt(wd + 970, 0, 3);
        return [wd, { completed: Math.max(0, total - missed - kaza), kaza, missed, total }];
      })
    ),
    timeOfWindow: {
      early: Math.floor(totalCompleted * 0.45),
      mid: Math.floor(totalCompleted * 0.35),
      late: Math.floor(totalCompleted * 0.15),
      unknown: Math.floor(totalCompleted * 0.05),
    },
    missedReasons: { sleep: 4, busy: 3, travel: 2, forgot: 1 },
  };
}

function buildFastingSummary() {
  return {
    ok: true,
    profile: { qadaOwed: 3, kaffarah: { active: false, targetDays: 0 }, vows: [] },
    qadaCompleted: 7,
    kaffarah: { completed: 0, currentRun: 0, runStale: false },
    stats: {
      total: 28,
      thisMonth: 3,
      last30: 5,
      voluntaryTotal: 18,
      monThuStreak: 7,
      bestMonThuStreak: 12,
    },
    recentLogs: [],
  };
}

function buildQuranSummary() {
  return {
    ok: true,
    profile: {
      dailyGoalPages: 1,
      currentPage: 142,
      khatmCount: 0,
      totalPages: 604,
      dailyGoalAyat: 10,
      currentAyah: 2140,
      totalAyat: 6236,
      khatamStartedAt: dateStr(45),
      readerPos: {},
      savedDuas: [],
    },
    todayPages: 1,
    todayAyat: 7,
    goalMet: false,
    streak: 5,
    bestStreak: 14,
    last7: Array.from({ length: 7 }, (_, i) => ({
      date: dateStr(6 - i),
      pages: seedInt(i + 300, 0, 3),
      units: seedInt(i + 300, 0, 15),
    })),
    stats: { last30Pages: 18, allTimePages: 142, last30Units: 156, allTimeUnits: 2140 },
    pace: 5,
    estDaysToKhatm: 819,
    topSurahs: [
      { surah: 112, completions: 15 },
      { surah: 36, completions: 8 },
      { surah: 67, completions: 6 },
      { surah: 55, completions: 4 },
      { surah: 18, completions: 2 },
    ],
    bookmarks: [],
  };
}

function buildQuranHistory() {
  return {
    ok: true,
    history: Array.from({ length: 30 }, (_, i) => ({
      date: dateStr(29 - i),
      units: seedInt(i + 400, 0, 12),
    })),
  };
}

function parseDays(url: string): number {
  const m = url.match(/days=(\d+)/);
  return m ? parseInt(m[1], 10) : 30;
}

function buildCycleSummary() {
  return {
    ok: true,
    active: null,
    // Every field the Rayhanah page reads must exist here: a missing
    // partnerSync crashed the demo for sisters before v5.68.0.
    partnerSync: { enabled: false, partnerUid: null },
    pregnancy: { active: false, dueDate: null, weeksAlong: null },
    prediction: {
      nextStart: dateStr(-15), // 15 days from now
      avgCycleDays: 28,
      avgPeriodDays: 6,
      basedOnCycles: 4,
    },
    madhab: 'majority',
    logs: [
      { _id: 'log-001', type: 'hayd', startDate: dateStr(36), endDate: dateStr(30) },
      { _id: 'log-002', type: 'hayd', startDate: dateStr(64), endDate: dateStr(58) },
      { _id: 'log-003', type: 'hayd', startDate: dateStr(92), endDate: dateStr(86) },
      { _id: 'log-004', type: 'hayd', startDate: dateStr(120), endDate: dateStr(115) },
    ],
    days: [
      { date: dateStr(31), flow: 'medium', symptoms: ['cramps'], moods: ['low'] },
      {
        date: dateStr(32),
        flow: 'heavy',
        symptoms: ['cramps', 'fatigue'],
        moods: ['low', 'irritable'],
      },
      { date: dateStr(33), flow: 'medium', symptoms: ['headache'], moods: ['tired'] },
      { date: dateStr(34), flow: 'light', symptoms: [], moods: ['calm'] },
      { date: dateStr(35), flow: 'light', symptoms: [], moods: ['calm'] },
    ],
  };
}

function prayersDueDemo(): number {
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  if (h >= 20) return 5;
  if (h >= 18.5) return 4;
  if (h >= 16) return 3;
  if (h >= 12.5) return 2;
  if (h >= 5) return 1;
  return 0;
}

/** Shape the demo rows like the real circle (T3.6): you first, then friends
 * by longest streak, never ranked. One friend shares consistency only and
 * one keeps Quran secret, so the demo shows every kind of row. */
function toDemoCircle(
  rows: Array<Record<string, unknown> & { uid: string; isMe: boolean; displayName: string }>,
  streaksOnly: string,
  quranSecret: string
) {
  const days = ((new Date().getDay() + 2) % 7) + 1; // Friday to Thursday week
  const circle = rows.map((r) => {
    const activeDays = Math.max(1, days - (r.isMe ? 0 : 1));
    if (r.uid === streaksOnly) {
      return {
        uid: r.uid,
        displayName: r.displayName,
        country: r['country'],
        isMe: false,
        visibility: 'streaks' as const,
        zikrStreak: r['zikrStreak'],
        zikrState: r['zikrState'],
        quranStreak: r['quranStreak'],
        activeDays,
        weekDays: days,
      };
    }
    const row: Record<string, unknown> = {
      ...r,
      visibility: 'detail',
      activeDays,
      weekDays: days,
    };
    if (r.uid === quranSecret) {
      delete row['quranStreak'];
      delete row['quranPagesToday'];
      delete row['quranGoal'];
    }
    return row;
  });
  const longest = (r: Record<string, unknown>) =>
    Math.max(Number(r['zikrStreak'] ?? 0), Number(r['quranStreak'] ?? 0));
  return circle.sort(
    (a, b) =>
      Number(b['isMe']) - Number(a['isMe']) ||
      longest(b) - longest(a) ||
      String(a['displayName']).localeCompare(String(b['displayName']))
  );
}

const DEMO_PRIVACY = {
  visibility: 'streaks',
  secret: { salat: false, zikr: false, quran: false, fasting: false },
};

function buildSocialSummary(gender: string) {
  const due = prayersDueDemo();
  const isAfterMorning = new Date().getHours() >= 8;

  if (gender === 'female') {
    const leaderboard = [
      {
        uid: 'demo-f-002',
        displayName: 'Aisha',
        isMe: false,
        country: 'Egypt',
        salatToday: due,
        prayersDue: due,
        zikrStreak: 21,
        zikrState: 'active',
        zikrToday: 612,
        zikrGoal: 500,
        zikrGoalMet: true,
        fastsThisMonth: 10,
        fastedToday: isAfterMorning,
        quranStreak: 14,
        quranPagesToday: 3,
        quranGoal: 2,
        score: 95,
      },
      {
        uid: 'demo-001',
        displayName: 'Khadijah',
        isMe: true,
        country: 'Bangladesh',
        salatToday: due,
        prayersDue: due,
        zikrStreak: 12,
        zikrState: 'active',
        zikrToday: 500,
        zikrGoal: 500,
        zikrGoalMet: true,
        fastsThisMonth: 8,
        fastedToday: isAfterMorning,
        quranStreak: 5,
        quranPagesToday: 2,
        quranGoal: 1,
        score: 90,
      },
      {
        uid: 'demo-f-003',
        displayName: 'Maryam',
        isMe: false,
        country: 'Turkey',
        salatToday: Math.max(0, due - 1),
        prayersDue: due,
        zikrStreak: 5,
        zikrState: 'active',
        zikrToday: 200,
        zikrGoal: 500,
        zikrGoalMet: false,
        fastsThisMonth: 6,
        fastedToday: false,
        quranStreak: 2,
        quranPagesToday: 1,
        quranGoal: 1,
        score: 68,
      },
      {
        uid: 'demo-f-004',
        displayName: 'Fatimah',
        isMe: false,
        country: 'Pakistan',
        salatToday: Math.max(0, due - 2),
        prayersDue: due,
        zikrStreak: 3,
        zikrState: 'grace',
        zikrToday: 80,
        zikrGoal: 500,
        zikrGoalMet: false,
        fastsThisMonth: 4,
        fastedToday: false,
        quranStreak: 0,
        quranPagesToday: 0,
        quranGoal: 1,
        score: 48,
      },
    ];
    return {
      ok: true,
      inviteCode: 'demo-invite-f',
      circle: toDemoCircle(leaderboard, 'demo-f-003', 'demo-f-004'),
      privacy: DEMO_PRIVACY,
      pendingCount: 0,
    };
  }

  const leaderboard = [
    {
      uid: 'demo-m-002',
      displayName: 'Umar',
      isMe: false,
      country: 'Kuwait',
      salatToday: due,
      prayersDue: due,
      zikrStreak: 30,
      zikrState: 'active',
      zikrToday: 1200,
      zikrGoal: 1000,
      zikrGoalMet: true,
      fastsThisMonth: 12,
      fastedToday: isAfterMorning,
      quranStreak: 21,
      quranPagesToday: 5,
      quranGoal: 3,
      score: 100,
    },
    {
      uid: 'demo-001',
      displayName: 'Abdullah',
      isMe: true,
      country: 'Bangladesh',
      salatToday: due,
      prayersDue: due,
      zikrStreak: 12,
      zikrState: 'active',
      zikrToday: 980,
      zikrGoal: 1000,
      zikrGoalMet: false,
      fastsThisMonth: 9,
      fastedToday: isAfterMorning,
      quranStreak: 7,
      quranPagesToday: 3,
      quranGoal: 3,
      score: 88,
    },
    {
      uid: 'demo-m-003',
      displayName: 'Ibrahim',
      isMe: false,
      country: 'Saudi Arabia',
      salatToday: Math.max(0, due - 1),
      prayersDue: due,
      zikrStreak: 8,
      zikrState: 'active',
      zikrToday: 500,
      zikrGoal: 1000,
      zikrGoalMet: false,
      fastsThisMonth: 7,
      fastedToday: false,
      quranStreak: 3,
      quranPagesToday: 2,
      quranGoal: 3,
      score: 74,
    },
    {
      uid: 'demo-m-004',
      displayName: 'Yusuf',
      isMe: false,
      country: 'Malaysia',
      salatToday: Math.max(0, due - 2),
      prayersDue: due,
      zikrStreak: 2,
      zikrState: 'none',
      zikrToday: 100,
      zikrGoal: 1000,
      zikrGoalMet: false,
      fastsThisMonth: 3,
      fastedToday: false,
      quranStreak: 0,
      quranPagesToday: 0,
      quranGoal: 3,
      score: 40,
    },
  ];
  return {
    ok: true,
    inviteCode: 'demo-invite-m',
    circle: toDemoCircle(leaderboard, 'demo-m-003', 'demo-m-004'),
    privacy: DEMO_PRIVACY,
    pendingCount: 0,
  };
}

// ── Analytics for the demo (U9) ─────────────────────────────────────────────
// Every analytics screen opens in the demo, so each endpoint those screens
// read answers here with believable, fixed numbers.

const queryParam = (url: string, key: string) =>
  new URL(url, 'http://demo.local').searchParams.get(key);

/** An ISO time on `day` (YYYY-MM-DD) at hh:mm, local time. */
const atTime = (day: string, h: number, m: number) =>
  new Date(`${day}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`).toISOString();

function buildZikrTimeOfDay() {
  return {
    ok: true,
    hours: Array.from({ length: 24 }, (_, hour) => {
      let total = seedInt(hour + 700, 0, 120);
      if (hour >= 5 && hour <= 7) total = seedInt(hour + 700, 250, 500);
      else if (hour >= 20 && hour <= 22) total = seedInt(hour + 700, 150, 350);
      else if (hour >= 1 && hour <= 3) total = 0;
      return { hour, total };
    }),
  };
}

function buildZikrSessions(date: string | null) {
  const day = date ?? dateStr(0);
  return {
    ok: true,
    sessions: [
      {
        start: atTime(day, 5, 40),
        end: atTime(day, 5, 52),
        total: 300,
        perType: { SubhanAllah: 100, Alhamdulillah: 100, 'Allahu Akbar': 100 },
      },
      {
        start: atTime(day, 13, 20),
        end: atTime(day, 13, 26),
        total: 100,
        perType: { Astaghfirullah: 100 },
      },
      {
        start: atTime(day, 21, 5),
        end: atTime(day, 21, 15),
        total: 200,
        perType: { 'La ilaha illallah': 100, 'Durud Ibrahim': 100 },
      },
    ],
  };
}

const DEMO_STATS_RESETS = {
  zikr: { date: null, history: [] },
  salat: { date: null, history: [] },
  fasting: { date: null, history: [] },
  quran: { date: null, history: [] },
};

function buildSalatDebtHistory(days: number) {
  const weeks = Math.max(1, Math.ceil(days / 7));
  return {
    ok: true,
    weeks: Array.from({ length: weeks }, (_, i) => ({
      weekStart: dateStr((weeks - i) * 7 - 1),
      weekEnd: dateStr((weeks - i - 1) * 7),
      accumulated: seedInt(i + 1100, 0, 4),
      paidBack: seedInt(i + 1200, 0, 5),
    })),
  };
}

function buildSalatDebtInsights() {
  return {
    ok: true,
    oldestOwed: { prayer: 'fajr', missedDate: dateStr(9) },
    avgPayoffDays: 3.5,
    itemizedOwedCount: 4,
    itemizedPaidCount: 17,
    perPrayer: {
      fajr: { owedCount: 1, oldestOwedDate: dateStr(9), avgPayoffDays: 4.2, paidCount: 6 },
      dhuhr: { owedCount: 1, oldestOwedDate: dateStr(5), avgPayoffDays: 2.8, paidCount: 3 },
      asr: { owedCount: 1, oldestOwedDate: dateStr(2), avgPayoffDays: 3.1, paidCount: 3 },
      maghrib: { owedCount: 0, oldestOwedDate: null, avgPayoffDays: 1.5, paidCount: 1 },
      isha: { owedCount: 1, oldestOwedDate: dateStr(2), avgPayoffDays: 3.9, paidCount: 4 },
    },
  };
}

function buildSalatJourney() {
  return {
    ok: true,
    phases: [
      {
        index: 1,
        from: dateStr(120),
        to: null,
        days: 121,
        done: 520,
        missed: 38,
        kaza: 47,
        completionRate: 86,
        resetNote: null,
      },
    ],
  };
}

function buildSalatCorrelation() {
  return {
    ok: true,
    available: true,
    earlyIshaFajrRate: 82,
    lateIshaFajrRate: 54,
    earlySampleSize: 34,
    lateSampleSize: 19,
  };
}

function buildFastingHistory(days: number) {
  const logs = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const wd = d.getDay();
    // Mondays and Thursdays, most weeks.
    if ((wd === 1 || wd === 4) && seedInt(i + 1300, 0, 3) > 0) {
      logs.push({
        _id: `demo-fast-${i}`,
        userId: 'demo',
        date: dateStr(i),
        category: 'voluntary',
        voluntaryKind: 'monThu',
        status: 'completed',
      });
    }
  }
  return { ok: true, logs };
}

function buildWorshipCorrelation(days: number) {
  return {
    ok: true,
    windowDays: days,
    fastingDays: { days: 9, avgSalatCompletionPct: 94, avgZikrCount: 820, avgQuranUnits: 14 },
    nonFastingDays: {
      days: Math.max(0, days - 9),
      avgSalatCompletionPct: 81,
      avgZikrCount: 560,
      avgQuranUnits: 8,
    },
    insufficientData: false,
  };
}

function buildQuranRange(url: string) {
  const to = queryParam(url, 'to') ?? dateStr(0);
  const fromParam = queryParam(url, 'from');
  const toDate = new Date(`${to}T12:00:00`);
  const fromDate = fromParam
    ? new Date(`${fromParam}T12:00:00`)
    : new Date(toDate.getTime() - 29 * 864e5);
  // An "all time" window can start years back: the demo has 120 days.
  const span = Math.min(
    120,
    Math.max(1, Math.round((toDate.getTime() - fromDate.getTime()) / 864e5) + 1)
  );
  const history = Array.from({ length: span }, (_, i) => {
    const d = new Date(toDate.getTime() - (span - 1 - i) * 864e5);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const ayat = seedInt(i + 1400, 0, 4) === 0 ? 0 : seedInt(i + 1500, 4, 22);
    return { date, ayat, pages: Math.round(ayat / 15), units: ayat };
  });
  const activeDays = history.filter((h) => h.units > 0).length;
  return {
    ok: true,
    history,
    stats: {
      readSec: activeDays * 540,
      listenSec: activeDays * 300,
      readSessions: activeDays,
      listenSessions: Math.round(activeDays * 0.6),
      activeDays,
      totalUnits: history.reduce((sum, h) => sum + h.units, 0),
    },
  };
}

function buildQuranSessions(date: string | null) {
  const day = date ?? dateStr(0);
  return {
    ok: true,
    sessions: [
      {
        start: atTime(day, 5, 55),
        end: atTime(day, 6, 10),
        activeDurationSec: 780,
        ayahCount: 7,
        pagesRead: 1,
        surahs: [18],
        source: 'read',
      },
      {
        start: atTime(day, 22, 0),
        end: atTime(day, 22, 8),
        activeDurationSec: 470,
        ayahCount: 30,
        pagesRead: 0,
        surahs: [67],
        source: 'listen',
      },
    ],
  };
}

function buildQuranTimeOfDay() {
  return {
    ok: true,
    hours: Array.from({ length: 24 }, (_, hour) => {
      let total = 0;
      if (hour === 5 || hour === 6) total = seedInt(hour + 1600, 40, 90);
      else if (hour === 21 || hour === 22) total = seedInt(hour + 1600, 20, 50);
      return { hour, total };
    }),
  };
}

function buildHifzSummary() {
  const row = (
    surah: number,
    totalAyat: number,
    solid: number,
    consolidating = 0,
    learning = 0,
    fresh = 0
  ) => ({
    surah,
    totalAyat,
    memorised: solid + consolidating + learning + fresh,
    solid,
    consolidating,
    learning,
    new: fresh,
  });
  return {
    ok: true,
    profile: { dailyNewTarget: 3, dailyRevisionTarget: 10, nextSurah: 78, nextAyah: 12 },
    today: { newCount: 2, revisionCount: 6 },
    newGoalMet: false,
    revisionGoalMet: false,
    dueCount: 4,
    streak: 6,
    bestStreak: 19,
    totals: { new: 1, learning: 6, consolidating: 16, solid: 40, total: 63 },
    heatmap: [
      row(1, 7, 7),
      row(112, 4, 4),
      row(113, 5, 5),
      row(114, 6, 6),
      row(67, 30, 18, 12),
      row(78, 40, 0, 4, 6, 1),
    ],
  };
}

function buildHifzQueue() {
  const entry = (surah: number, ayah: number, state: string) => ({
    surah,
    ayah,
    state,
    dueDate: dateStr(0),
    reps: 3,
    lapses: 0,
    lastResult: 'good',
  });
  return {
    ok: true,
    due: [
      entry(67, 13, 'consolidating'),
      entry(67, 14, 'consolidating'),
      entry(78, 5, 'learning'),
      entry(78, 6, 'learning'),
    ],
    nextNew: { surah: 78, ayah: 12 },
  };
}

// Fasting logs written in the demo (Home's Fasting section, the Fasting
// page), kept in memory for this page view so a "Yes" survives the refetch.
const demoFastingLogs = new Map<string, Record<string, unknown>>();
const demoAdhkarDays = new Map<string, { date: string; morning: boolean; evening: boolean }>();
const queryDate = (url: string) => new URL(url, 'http://demo.local').searchParams.get('date');

export function getDemoResponse(
  url: string,
  method: string,
  gender = 'male',
  body?: unknown
): unknown {
  if (url.includes('/api/fasting/log')) {
    if (method === 'put') {
      const b = (typeof body === 'string' ? JSON.parse(body) : body) as { date?: string } | null;
      if (b?.date) demoFastingLogs.set(b.date, { ...b });
      return { ok: true, log: (b?.date && demoFastingLogs.get(b.date)) || null };
    }
    if (method === 'delete') {
      const d = queryDate(url);
      if (d) demoFastingLogs.delete(d);
      return { ok: true };
    }
  }
  // Adhkar routine done flags, kept for the visit like the fasting logs.
  if (url.includes('/api/adhkar/day')) {
    const b = (typeof body === 'string' ? JSON.parse(body) : body) as {
      date?: string;
      period?: 'morning' | 'evening';
    } | null;
    const date = (method === 'put' ? b?.date : queryDate(url)) ?? '';
    const day = demoAdhkarDays.get(date) ?? { date, morning: false, evening: false };
    if (method === 'put' && b?.period) demoAdhkarDays.set(date, { ...day, [b.period]: true });
    return { ok: true, day: demoAdhkarDays.get(date) ?? day };
  }
  if (method !== 'get') return { ok: true };

  if (url.includes('/api/zikr/analytics')) return buildZikrAnalytics(parseDays(url));
  if (/\/api\/analytics(\?|$)/.test(url)) return buildZikrAnalytics(parseDays(url));
  if (url.includes('/api/analytics/goal'))
    return { ok: true, goal: { dailyTarget: 500, isActive: true, graceDays: 1 } };
  if (url.includes('/api/analytics/streak'))
    return { ok: true, streak: { currentStreak: 12, longestStreak: 21, state: 'active' } };
  if (url.includes('/api/zikr/time-of-day')) return buildZikrTimeOfDay();
  if (url.includes('/api/zikr/sessions')) return buildZikrSessions(queryParam(url, 'date'));
  if (url.includes('/api/stats/resets')) return { ok: true, resets: DEMO_STATS_RESETS };
  if (url.includes('/api/salat/debt/history')) return buildSalatDebtHistory(parseDays(url));
  if (url.includes('/api/salat/debt/insights')) return buildSalatDebtInsights();
  if (url.includes('/api/salat/journey')) return buildSalatJourney();
  if (url.includes('/api/salat/correlations')) return buildSalatCorrelation();
  if (url.includes('/api/fasting/history')) return buildFastingHistory(parseDays(url));
  if (url.includes('/api/insights/worship-correlation'))
    return buildWorshipCorrelation(parseDays(url));
  if (url.includes('/api/quran/range')) return buildQuranRange(url);
  if (url.includes('/api/quran/sessions')) return buildQuranSessions(queryParam(url, 'date'));
  if (url.includes('/api/quran/time-of-day')) return buildQuranTimeOfDay();
  if (url.includes('/api/cycle/body-stats'))
    return { ok: true, heightCm: 160, weightKg: 55, bmi: 21.5 };
  if (url.includes('/api/hifz/summary')) return buildHifzSummary();
  if (url.includes('/api/hifz/queue')) return buildHifzQueue();
  if (url.includes('/api/salat/analytics')) return buildSalatAnalytics(parseDays(url));
  // Kaza debt: a small itemized debt, so the Kaza Debt and Travel kaza cards
  // have something real to show (the travel card only lists days that fall
  // on a journey the visitor records in Musafir mode).
  if (url.includes('/api/salat/debt/units'))
    return {
      ok: true,
      units: [
        { prayer: 'isha', missedDate: dateStr(2) },
        { prayer: 'asr', missedDate: dateStr(2) },
        { prayer: 'dhuhr', missedDate: dateStr(5) },
        { prayer: 'fajr', missedDate: dateStr(9) },
      ],
    };
  if (/\/api\/salat\/debt(\?|$)/.test(url))
    return {
      ok: true,
      owed: { fajr: 1, dhuhr: 1, asr: 1, maghrib: 0, isha: 1 },
      totalOwed: 4,
      since: dateStr(30),
    };
  if (url.includes('/api/salat')) return buildSalatLog();
  if (url.includes('/api/fasting/summary')) return buildFastingSummary();
  if (url.includes('/api/fasting')) {
    const d = queryDate(url);
    return { ok: true, log: (d && demoFastingLogs.get(d)) || null };
  }
  if (url.includes('/api/quran/summary')) return buildQuranSummary();
  if (url.includes('/api/quran/history')) return buildQuranHistory();
  if (url.includes('/api/cycle/active')) return { ok: true, active: null };
  if (url.includes('/api/cycle/summary')) return buildCycleSummary();
  if (url.includes('/api/social/summary')) return buildSocialSummary(gender);
  if (url.includes('/api/social/alltime')) {
    // A believable year: each full-detail person's today score, ~5 months over
    const allTime: Record<string, number> = {};
    const circle = buildSocialSummary(gender).circle as {
      uid: string;
      isMe: boolean;
      visibility?: string;
      score?: number | null;
    }[];
    for (const f of circle) {
      if (typeof f.score === 'number' && (f.isMe || f.visibility !== 'streaks')) {
        allTime[f.uid] = f.score * 150;
      }
    }
    return { ok: true, allTime };
  }
  if (url.includes('/api/social/friends')) return { ok: true, friends: [] };
  if (url.includes('/api/friends')) return { ok: true, friends: [] };
  // Sadaqah pages read these shapes; the demo shows them empty (no invented
  // donation figures, no payment numbers).
  if (url.includes('/api/sadaqah/stats'))
    return {
      ok: true,
      totalVerifiedAmount: 0,
      totalVerifiedCount: 0,
      totalContributors: 0,
      lastUpdated: new Date().toISOString(),
      quarterlyBreakdown: [],
    };
  if (url.includes('/api/sadaqah/config'))
    return { ok: true, bkashNumber: null, nagadNumber: null, nagadEnabled: false };
  if (url.includes('/api/announcements/active')) return { ok: true, announcement: null };
  if (url.includes('/api/auth/verify')) return { ok: true, user: getDemoUser('male') };
  if (url.includes('/api/user/me')) return { ok: true };
  return { ok: true };
}
