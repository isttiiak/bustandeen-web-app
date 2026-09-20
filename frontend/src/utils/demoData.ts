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
        asr: { status: 'completed', at: 'home', tasbeeh: true },
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
    weeklyMosqueTrend: Array.from({ length: 4 }, (_, i) => ({
      week: dateStr(28 - i * 7),
      mosqueRate: Math.round(20 + seedInt(i + 900, 0, 50)),
    })),
  };
}

function buildFastingSummary() {
  return {
    ok: true,
    profile: { qadaOwed: 3, kaffarah: { active: false, targetDays: 0 }, vows: [] },
    qadaCompleted: 7,
    kaffarah: { completed: 0, currentRun: 0, runStale: false },
    stats: { total: 28, thisMonth: 3, last30: 5, voluntaryTotal: 18, monThuStreak: 7 },
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
      { surah: 36, completions: 8 },
      { surah: 67, completions: 6 },
      { surah: 55, completions: 4 },
      { surah: 18, completions: 2 },
      { surah: 112, completions: 15 },
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
      leaderboard: leaderboard.sort((a, b) => b.score - a.score),
      invisible: false,
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
    leaderboard: leaderboard.sort((a, b) => b.score - a.score),
    invisible: false,
    pendingCount: 0,
  };
}

export function getDemoResponse(url: string, method: string, gender = 'male'): unknown {
  if (method !== 'get') return { ok: true };

  if (url.includes('/api/zikr/analytics')) return buildZikrAnalytics(parseDays(url));
  if (url.includes('/api/salat/analytics')) return buildSalatAnalytics(parseDays(url));
  if (url.includes('/api/salat')) return buildSalatLog();
  if (url.includes('/api/fasting/summary')) return buildFastingSummary();
  if (url.includes('/api/fasting')) return { ok: true, log: null };
  if (url.includes('/api/quran/summary')) return buildQuranSummary();
  if (url.includes('/api/quran/history')) return buildQuranHistory();
  if (url.includes('/api/cycle/active')) return { ok: true, active: null };
  if (url.includes('/api/cycle/summary')) return buildCycleSummary();
  if (url.includes('/api/social/summary')) return buildSocialSummary(gender);
  if (url.includes('/api/social/noor')) return { ok: true, today: 88, allTime: 14250 };
  if (url.includes('/api/social/friends')) return { ok: true, friends: [] };
  if (url.includes('/api/friends')) return { ok: true, friends: [] };
  if (url.includes('/api/auth/verify')) return { ok: true, user: getDemoUser('male') };
  if (url.includes('/api/user/me')) return { ok: true };
  return { ok: true };
}
