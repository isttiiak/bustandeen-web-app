import User from '../models/User.js';
import ZikrDaily from '../models/ZikrDaily.js';
import ZikrGoal, { IZikrGoal } from '../models/ZikrGoal.js';
import { getStreak, classifyDays, StreakResponse } from './streak.service.js';
import {
  truncateToTimezone,
  bucketDateForDayString,
  DEFAULT_TIMEZONE_OFFSET,
} from '../utils/timezone-flexible.js';
import { ChartDataPoint } from '../types/api.types.js';

export interface AnalyticsData {
  period: { days: number; startDate: string; endDate: string };
  chartData: ChartDataPoint[];
  stats: { average: number; maxDay: string | null; maxCount: number; total: number };
  today: { total: number; goalMet: boolean; perType: Array<{ zikrType: string; total: number }> };
  goal: IZikrGoal | { dailyTarget: number; isActive: boolean };
  streak: StreakResponse;
  allTime: { totalCount: number; bestDay: { date: Date | null; count: number } };
  perType: Array<{ zikrType: string; total: number }>;
}

export async function getAnalyticsData(
  userId: string,
  days: number = 7,
  timezoneOffset: number = DEFAULT_TIMEZONE_OFFSET,
  todayStr?: string
): Promise<AnalyticsData> {
  const DAY_MS = 86_400_000;
  // Fajr-boundary tracking day (client-sent); clock+offset fallback
  const today =
    (todayStr ? bucketDateForDayString(todayStr, timezoneOffset) : null) ??
    truncateToTimezone(Date.now(), timezoneOffset);
  const startDate = new Date(today.getTime() - (days - 1) * DAY_MS);

  // truncateToTimezone anchors every bucket so its UTC date part equals the
  // user's LOCAL calendar date (positive offsets use an end-of-day anchor at
  // 24:00−offset UTC on that date). The plain ISO date part is therefore the
  // correct label — do NOT shift it by the offset again.
  const dateKey = (d: Date): string => d.toISOString().split('T')[0] ?? '';

  const records = await ZikrDaily.find({
    userId,
    date: { $gte: startDate, $lte: today },
  }).sort({ date: 1 });

  const dailyTotals = new Map<string, number>();
  const dailyBreakdown = new Map<string, Record<string, number>>();

  records.forEach((r) => {
    const dateStr = dateKey(r.date);
    dailyTotals.set(dateStr, (dailyTotals.get(dateStr) ?? 0) + r.count);
    const bd = dailyBreakdown.get(dateStr) ?? {};
    bd[r.zikrType] = (bd[r.zikrType] ?? 0) + r.count;
    dailyBreakdown.set(dateStr, bd);
  });

  // Per-day streak status (met / pending / grace / missed) for heatmap tags —
  // needs the goal, so it's filled in after the goal loads below.
  const chartData: ChartDataPoint[] = [];
  for (let i = 0; i < days; i++) {
    const dateStr = dateKey(new Date(startDate.getTime() + i * DAY_MS));
    chartData.push({
      date: dateStr,
      total: dailyTotals.get(dateStr) ?? 0,
      breakdown: dailyBreakdown.get(dateStr) ?? {},
    });
  }

  const totals = chartData.map((d) => d.total);
  const maxDay = chartData.reduce(
    (max, d) => (d.total > max.total ? d : max),
    chartData[0] ?? { date: null as unknown as string, total: 0, breakdown: {} }
  );
  const average =
    totals.length > 0 ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : 0;

  // getStreak derives the live streak from buckets (2-consecutive-miss reset,
  // single-day grace) and refreshes the checkpoint — no cron needed.
  const [goal, streak, todayRecords, user] = await Promise.all([
    ZikrGoal.findOne({ userId }),
    getStreak(userId, timezoneOffset, todayStr),
    ZikrDaily.find({ userId, date: today }),
    User.findOne({ uid: userId }).select('totalCount zikrTotals'),
  ]);

  const todayTotal = todayRecords.reduce((sum, r) => sum + r.count, 0);
  const todayPerType = todayRecords.map((r) => ({ zikrType: r.zikrType, total: r.count }));

  // Tag each chart day for the weekly heatmap (grace days show a "chance" tag)
  {
    const dailyTarget = goal?.dailyTarget ?? 100;
    const totalsMap = new Map<string, number>(chartData.map((d) => [d.date, d.total]));
    const statuses = classifyDays(
      chartData.map((d) => d.date),
      totalsMap,
      dailyTarget,
      dateKey(today),
      goal?.graceDays ?? 1
    );
    for (const d of chartData) d.status = statuses[d.date];
  }

  let perType: Array<{ zikrType: string; total: number }> = [];
  if (user?.zikrTotals instanceof Map) {
    perType = [...user.zikrTotals.entries()].map(([zikrType, total]) => ({ zikrType, total }));
  } else if (user?.zikrTotals && typeof user.zikrTotals === 'object') {
    perType = Object.entries(user.zikrTotals as unknown as Record<string, number>).map(
      ([zikrType, total]) => ({ zikrType, total })
    );
  }

  const allDailyRecords = (await ZikrDaily.aggregate([
    { $match: { userId } },
    { $group: { _id: '$date', total: { $sum: '$count' } } },
    { $sort: { total: -1 } },
    { $limit: 1 },
  ])) as Array<{ _id: Date; total: number }>;

  const bestDay =
    allDailyRecords.length > 0
      ? { date: allDailyRecords[0]?._id ?? null, count: allDailyRecords[0]?.total ?? 0 }
      : { date: null, count: 0 };

  return {
    period: {
      days,
      startDate: dateKey(startDate),
      endDate: dateKey(today),
    },
    chartData,
    stats: {
      average,
      maxDay: maxDay.date ?? null,
      maxCount: maxDay.total,
      total: totals.reduce((a, b) => a + b, 0),
    },
    today: {
      total: todayTotal,
      goalMet: goal ? todayTotal >= goal.dailyTarget : false,
      perType: todayPerType.sort((a, b) => b.total - a.total),
    },
    goal: goal ?? { dailyTarget: 100, isActive: true },
    streak,
    allTime: { totalCount: user?.totalCount ?? 0, bestDay },
    perType: perType.sort((a, b) => b.total - a.total),
  };
}

export async function getGoal(userId: string): Promise<IZikrGoal> {
  let goal = await ZikrGoal.findOne({ userId });
  if (!goal) {
    goal = new ZikrGoal({ userId, dailyTarget: 100 });
    await goal.save();
  }
  return goal;
}

export async function setGoal(
  userId: string,
  dailyTarget: number,
  graceDays?: number
): Promise<IZikrGoal> {
  let goal = await ZikrGoal.findOne({ userId });
  if (!goal) {
    goal = new ZikrGoal({ userId, dailyTarget, graceDays });
  } else {
    goal.dailyTarget = dailyTarget;
    goal.isActive = true;
    if (graceDays !== undefined) goal.graceDays = graceDays;
  }
  await goal.save();
  return goal;
}
