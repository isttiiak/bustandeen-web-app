import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import api from '../lib/api.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { enqueueSalatOp, peekSalatOutbox, removeSalatOp } from '../utils/salatOutbox.js';
import { getTrackingDay } from '../utils/trackingDay.js';
import { getUserTimezoneOffset } from '../utils/timezone.js';

// Thrown from a mutationFn to tell onError/onSettled "this wasn't a real
// failure — it's queued for replay, keep the optimistic UI as-is."
class OfflineQueuedError extends Error {
  constructor() {
    super('offline-queued');
    this.name = 'OfflineQueuedError';
  }
}

function isNetworkError(err: unknown): boolean {
  // No `response` means the request never reached the server — offline,
  // DNS failure, timeout. A real 4xx/5xx has a response and should roll back
  // the optimistic update as before, not get silently queued forever.
  return axios.isAxiosError(err) && !err.response;
}

export type PrayerStatus = 'completed' | 'kaza' | 'missed' | 'pending';
export type PrayerLocation = 'home' | 'mosque' | 'jamat';
export type PrayerId = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export const MISSED_REASONS = ['sleep', 'travel', 'forgot', 'busy', 'other'] as const;
export type MissedReason = (typeof MISSED_REASONS)[number];

// NOTE: 'witr' stays in the union so existing logs that recorded it still
// type-check and render, but it is NOT offered in the picker — Witr belongs
// with Isha, not with voluntary rak'ah counting (Istiak's spec). See
// SELECTABLE_NAFL_TYPES below.
export const NAFL_TYPE_IDS = [
  'tahajjud',
  'ishraq',
  'duha',
  'awwabin',
  'witr',
  'tahiyyat_wudu',
  'tahiyyat_masjid',
  'hajat',
  'istikharah',
  'tarawih',
] as const;
export type NaflType = (typeof NAFL_TYPE_IDS)[number];

export interface NaflTypeMeta {
  id: NaflType;
  label: string;
  arabic: string;
  emoji: string;
  shortNote: string;
  /** Bengali translation of `shortNote`. */
  shortNoteBn?: string;
  fullNote: string;
  /** Bengali translation of `fullNote`. */
  fullNoteBn?: string;
  hadith: string;
  /** Bengali translation of `hadith` (quote + citation, citation already
   * transliterated — no need to run this through translateReference()). */
  hadithBn?: string;
  hadithUrl: string;
  defaultRakat: number;
}

export const NAFL_TYPE_META: NaflTypeMeta[] = [
  {
    id: 'tahajjud',
    label: 'Tahajjud',
    arabic: 'التهجد',
    emoji: '🌙',
    shortNote: 'Night prayer — last third of night',
    shortNoteBn: 'রাতের নামায — রাতের শেষ তৃতীয়াংশ',
    fullNote:
      "The most virtuous voluntary prayer after the obligatory. 2–12 rak'ahs. Finish with Witr.",
    fullNoteBn: 'ফরযের পর সর্বাধিক ফযীলতপূর্ণ নফল নামায। ২-১২ রাকাত। বিতর দিয়ে শেষ করুন।',
    hadith:
      '"The best prayer after the obligatory prayers is the night prayer." — Ṣaḥīḥ Muslim 1163',
    hadithBn: '"ফরয নামাযের পর সর্বোত্তম নামায হলো রাতের নামায।" — সহীহ মুসলিম ১১৬৩',
    hadithUrl: 'https://sunnah.com/muslim:1163',
    defaultRakat: 2,
  },
  {
    id: 'ishraq',
    label: 'Ishraq',
    arabic: 'الإشراق',
    emoji: '🌅',
    shortNote: '~20 min after sunrise',
    shortNoteBn: 'সূর্যোদয়ের প্রায় ২০ মিনিট পর',
    fullNote:
      '"Whoever prays Fajr in congregation, sits remembering Allah until sunrise, then prays two rak\'ahs — reward like Ḥajj and \'Umrah, complete, complete, complete."',
    fullNoteBn:
      '"যে ব্যক্তি জামাতে ফজর পড়ে, সূর্যোদয় পর্যন্ত আল্লাহর যিকিরে বসে থাকে, তারপর দুই রাকাত পড়ে — তার জন্য হজ্জ ও উমরার পূর্ণ, পূর্ণ, পূর্ণ সওয়াব।"',
    hadith: 'Tirmidhī 586',
    hadithBn: 'তিরমিযী ৫৮৬',
    hadithUrl: 'https://sunnah.com/tirmidhi:586',
    defaultRakat: 2,
  },
  {
    id: 'duha',
    label: 'Duha (Chasht)',
    arabic: 'الضحى',
    emoji: '☀️',
    shortNote: "Mid-morning, min 2 rak'ahs (4+ preferred)",
    shortNoteBn: 'মধ্য-সকাল, সর্বনিম্ন ২ রাকাত (৪+ উত্তম)',
    fullNote:
      'Minimum 2 rak\'ahs; 4 is preferred in the Ḥanafī school. "The Prophet ﷺ used to pray Duha four rak\'ahs and would add more as Allah willed." Maximum is 12.',
    fullNoteBn:
      'সর্বনিম্ন ২ রাকাত; হানাফী মাযহাবে ৪ রাকাত উত্তম। "নবী ﷺ চাশতের নামায চার রাকাত পড়তেন এবং আল্লাহ যতটা চাইতেন ততটা বাড়াতেন।" সর্বোচ্চ ১২ রাকাত।',
    hadith: 'Ṣaḥīḥ Muslim 717',
    hadithBn: 'সহীহ মুসলিম ৭১৭',
    hadithUrl: 'https://sunnah.com/muslim:717',
    defaultRakat: 2,
  },
  {
    id: 'awwabin',
    label: 'Awwabin',
    arabic: 'الأوابين',
    emoji: '⭐',
    shortNote: "2–6 rak'ahs after Maghrib",
    shortNoteBn: 'মাগরিবের পর ২-৬ রাকাত',
    fullNote: 'Prayed between Maghrib and Isha. For those who frequently return (awwāb) to Allah.',
    fullNoteBn:
      'মাগরিব ও এশার মধ্যবর্তী সময়ে পড়া হয়। যারা বারবার আল্লাহর দিকে ফিরে আসে (আউয়াব) তাদের জন্য।',
    hadith: 'Ibn Mājah 1167',
    hadithBn: 'ইবনে মাজাহ ১১৬৭',
    hadithUrl: 'https://sunnah.com/ibnmajah:1167',
    defaultRakat: 6,
  },
  {
    id: 'witr',
    label: 'Witr',
    arabic: 'الوتر',
    emoji: '🕯️',
    shortNote: "After Isha — odd rak'ahs",
    shortNoteBn: 'এশার পর — বিজোড় রাকাত',
    fullNote:
      "Highly recommended (wājib in Ḥanafī school). Prayed after Isha, before Fajr. Usually 3 rak'ahs with Qunūt du'a.",
    fullNoteBn:
      "অত্যন্ত গুরুত্বপূর্ণ (হানাফী মাযহাবে ওয়াজিব)। এশার পর, ফজরের আগে পড়া হয়। সাধারণত কুনূত দু'আসহ ৩ রাকাত।",
    hadith: '"Make Witr the last of your night prayers." — Ṣaḥīḥ al-Bukhārī 998',
    hadithBn: '"তোমাদের রাতের নামাযের শেষে বিতর পড়ো।" — সহীহ বুখারী ৯৯৮',
    hadithUrl: 'https://sunnah.com/bukhari:998',
    defaultRakat: 2,
  },
  {
    id: 'tahiyyat_wudu',
    label: "Tahiyyat al-Wudu'",
    arabic: 'تحية الوضوء',
    emoji: '💧',
    shortNote: "2 rak'ahs after wudu",
    shortNoteBn: 'ওযুর পর ২ রাকাত',
    fullNote:
      'Bilāl (RA) was asked about his deed in Paradise. He said: "I do not do anything except that whenever I perform wudu, I pray two rak\'ahs."',
    fullNoteBn:
      'বিলাল (রা)-কে জান্নাতে তাঁর আমল সম্পর্কে জিজ্ঞাসা করা হয়েছিল। তিনি বলেছিলেন: "আমি এছাড়া আর কিছু করি না যে, যখনই ওযু করি, দুই রাকাত নামায পড়ি।"',
    hadith: 'Ṣaḥīḥ al-Bukhārī 1149',
    hadithBn: 'সহীহ বুখারী ১১৪৯',
    hadithUrl: 'https://sunnah.com/bukhari:1149',
    defaultRakat: 2,
  },
  {
    id: 'tahiyyat_masjid',
    label: 'Tahiyyat al-Masjid',
    arabic: 'تحية المسجد',
    emoji: '🕌',
    shortNote: "2 rak'ahs upon entering mosque",
    shortNoteBn: 'মসজিদে প্রবেশ করে ২ রাকাত',
    fullNote:
      '"When one of you enters the mosque, let him not sit until he has prayed two rak\'ahs." Do not sit before praying them.',
    fullNoteBn:
      '"তোমাদের কেউ মসজিদে প্রবেশ করলে দুই রাকাত নামায না পড়া পর্যন্ত যেন না বসে।" নামায না পড়ে বসবেন না।',
    hadith: 'Ṣaḥīḥ Muslim 714',
    hadithBn: 'সহীহ মুসলিম ৭১৪',
    hadithUrl: 'https://sunnah.com/muslim:714',
    defaultRakat: 2,
  },
  {
    id: 'hajat',
    label: 'Ṣalāt al-Ḥājat',
    arabic: 'صلاة الحاجة',
    emoji: '🤲',
    shortNote: "2 rak'ahs for a need",
    shortNoteBn: 'প্রয়োজনের জন্য ২ রাকাত',
    fullNote:
      '"Whoever has a need with Allah or any human being, let him perform wudu, pray two rak\'ahs, then praise Allah, send blessings upon the Prophet ﷺ, then make du\'a."',
    fullNoteBn:
      '"যার আল্লাহর কাছে অথবা কোনো মানুষের কাছে কোনো প্রয়োজন আছে, সে যেন ওযু করে, দুই রাকাত নামায পড়ে, তারপর আল্লাহর প্রশংসা করে, নবী ﷺ-এর প্রতি দরুদ পাঠ করে, তারপর দু\'আ করে।"',
    hadith: 'Sunan Ibn Mājah 1384',
    hadithBn: 'সুনান ইবনে মাজাহ ১৩৮৪',
    hadithUrl: 'https://sunnah.com/ibnmajah:1384',
    defaultRakat: 2,
  },
  {
    id: 'istikharah',
    label: 'Istikharah',
    arabic: 'الاستخارة',
    emoji: '🎯',
    shortNote: "2 rak'ahs for guidance",
    shortNoteBn: 'দিকনির্দেশনার জন্য ২ রাকাত',
    fullNote:
      "\"The Prophet ﷺ used to teach us Istikharah for all our affairs as he would teach a surah of the Qur'an.\" Pray two rak'ahs then recite the Istikharah du'a.",
    fullNoteBn:
      '"নবী ﷺ আমাদের সকল বিষয়ে ইস্তিখারা শেখাতেন, যেমন তিনি কুরআনের একটি সূরা শেখাতেন।" দুই রাকাত নামায পড়ে ইস্তিখারার দু\'আ পড়ুন।',
    hadith: 'Ṣaḥīḥ al-Bukhārī 1162',
    hadithBn: 'সহীহ বুখারী ১১৬২',
    hadithUrl: 'https://sunnah.com/bukhari:1162',
    defaultRakat: 2,
  },
  {
    id: 'tarawih',
    label: 'Tarawih',
    arabic: 'التراويح',
    emoji: '🌙',
    shortNote: 'Ramadan night prayers',
    shortNoteBn: 'রমজানের রাতের নামায',
    fullNote:
      '8 or 20 rak\'ahs after Isha in Ramadan. "Whoever prays in Ramadan with faith and seeking reward, his past sins are forgiven."',
    fullNoteBn:
      'রমজানে এশার পর ৮ অথবা ২০ রাকাত। "যে ব্যক্তি ঈমানসহ ও সওয়াবের আশায় রমজানে নামায পড়ে, তার অতীতের গুনাহ ক্ষমা করে দেওয়া হয়।"',
    hadith: 'Ṣaḥīḥ al-Bukhārī 37',
    hadithBn: 'সহীহ বুখারী ৩৭',
    hadithUrl: 'https://sunnah.com/bukhari:37',
    defaultRakat: 8,
  },
];

/** What the nafl picker offers. Witr is deliberately excluded: it is prayed
 * after Isha as its own wājib/emphasised prayer, so counting its rak'ahs among
 * the voluntary ones double-counted it and forced odd totals into a section
 * that is otherwise all pairs. Historic logs containing it still display. */
export const SELECTABLE_NAFL_TYPES: NaflTypeMeta[] = NAFL_TYPE_META.filter((m) => m.id !== 'witr');

export interface PrayerEntry {
  status: PrayerStatus;
  prayedAt?: string;
  location?: PrayerLocation;
  tasbeeh?: boolean;
  ayatulKursi?: boolean;
  windowStart?: string;
  windowEnd?: string;
  missedReason?: MissedReason;
}

export interface NaflEntry {
  completed: boolean;
  types: NaflType[];
  rakat: number;
  completedAt?: string;
}

export interface SalatLog {
  _id: string;
  userId: string;
  date: string;
  prayers: Record<PrayerId, PrayerEntry>;
  nafl: NaflEntry;
}

export interface UpdatePrayerVars {
  prayer: PrayerId;
  status: PrayerStatus;
  date?: string;
  location?: PrayerLocation;
  tasbeeh?: boolean;
  ayatulKursi?: boolean;
  windowStart?: string;
  windowEnd?: string;
  missedReason?: MissedReason;
}

export interface UpdateNaflVars {
  completed: boolean;
  types: NaflType[];
  rakat: number;
  date?: string;
}

export interface SalatAnalytics {
  periodDays: number;
  totalDays: number;
  totalPossiblePrayers: number;
  completedCount: number;
  kazaCount: number;
  missedCount: number;
  prayedTotal: number;
  mosqueCount: number;
  jamaatCount: number;
  homeCount: number;
  tasbeehCount: number;
  naflDays: number;
  fridayCount: number;
  jumuahAttendedCount: number;
  completionRate: number;
  currentStreak: number;
  bestStreak: number;
  perPrayer: Record<
    string,
    {
      completed: number;
      kaza: number;
      missed: number;
      pending: number;
      mosque: number;
      jamat: number;
      tasbeeh: number;
      currentStreak: number;
      bestStreak: number;
    }
  >;
  last7Days: Array<{ date: string; completed: number; total: number }>;
  calendarData: Array<{ date: string; completed: number; total: number; logged: boolean }>;
  weeklyMosqueTrend: Array<{
    weekStart: string;
    weekEnd: string;
    mosqueCount: number;
    prayedCount: number;
    rate: number;
  }>;
  byWeekday: Record<number, { completed: number; kaza: number; missed: number; total: number }>;
  timeOfWindow: { early: number; mid: number; late: number; unknown: number };
  missedReasons: Record<string, number>;
}

const EMPTY_PRAYERS: Record<PrayerId, PrayerEntry> = {
  fajr: { status: 'pending' },
  dhuhr: { status: 'pending' },
  asr: { status: 'pending' },
  maghrib: { status: 'pending' },
  isha: { status: 'pending' },
};

const EMPTY_NAFL: NaflEntry = { completed: false, types: [], rakat: 2 };

// Salat is CIVIL-dated (midnight boundary) — NOT the Fajr tracking day. The
// tracker always sends its own selectedDate; this is only the fallback/today.
function localTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function useSalatLog(date?: string) {
  const user = useAuthStore((s) => s.user);
  const resolvedDate = date ?? localTodayStr();
  return useQuery({
    queryKey: ['salat', 'log', resolvedDate],
    queryFn: async () => {
      const { data } = await api.get<{ ok: boolean; log: SalatLog }>(
        `/api/salat?date=${resolvedDate}&today=${getTrackingDay()}`
      );
      return data.log;
    },
    enabled: !!user, // guests have no server log — placeholderData still renders the UI
    staleTime: 60_000,
    placeholderData: {
      _id: '',
      userId: '',
      date: resolvedDate,
      prayers: EMPTY_PRAYERS,
      nafl: EMPTY_NAFL,
    },
  });
}

export function useUpdatePrayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: UpdatePrayerVars) => {
      try {
        const { data } = await api.patch<{ ok: boolean; log: SalatLog }>('/api/salat/prayer', vars);
        return data.log;
      } catch (err) {
        if (isNetworkError(err)) {
          enqueueSalatOp({ kind: 'prayer', vars });
          throw new OfflineQueuedError();
        }
        throw err;
      }
    },
    onMutate: async (vars) => {
      const key = ['salat', 'log', vars.date ?? localTodayStr()];
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<SalatLog>(key);
      qc.setQueryData<SalatLog>(key, (old) => {
        if (!old) return old;
        return {
          ...old,
          prayers: {
            ...old.prayers,
            [vars.prayer]: {
              status: vars.status,
              prayedAt: vars.status !== 'pending' ? new Date().toISOString() : undefined,
              location:
                vars.status === 'completed' || vars.status === 'kaza'
                  ? (vars.location ?? 'home')
                  : undefined,
              tasbeeh:
                vars.status === 'completed' || vars.status === 'kaza'
                  ? (vars.tasbeeh ?? false)
                  : false,
              ayatulKursi:
                vars.status === 'completed' || vars.status === 'kaza'
                  ? (vars.ayatulKursi ?? false)
                  : false,
              windowStart:
                vars.status === 'completed' || vars.status === 'kaza'
                  ? vars.windowStart
                  : undefined,
              windowEnd:
                vars.status === 'completed' || vars.status === 'kaza' ? vars.windowEnd : undefined,
              missedReason: vars.status === 'missed' ? vars.missedReason : undefined,
            },
          },
        };
      });
      return { previous, key };
    },
    onError: (err, _vars, context) => {
      if (err instanceof OfflineQueuedError) {
        toast("You're offline — this will sync automatically once you're back online.", {
          icon: '📶',
          id: 'salat-offline',
        });
        return; // keep the optimistic state; don't roll back a change that's just queued
      }
      if (context?.previous !== undefined) qc.setQueryData(context.key, context.previous);
    },
    onSettled: (_data, err, vars) => {
      if (err instanceof OfflineQueuedError) return; // nothing changed server-side yet
      void qc.invalidateQueries({ queryKey: ['salat', 'log', vars.date ?? localTodayStr()] });
      void qc.invalidateQueries({ queryKey: ['salat', 'analytics'] });
      // A prayer moving into/out of 'missed' auto-adjusts the kaza debt server-side.
      void qc.invalidateQueries({ queryKey: ['salat', 'debt'] });
      void qc.invalidateQueries({ queryKey: ['salat', 'debtHistory'] });
    },
  });
}

export function useUpdateNafl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: UpdateNaflVars) => {
      try {
        const { data } = await api.patch<{ ok: boolean; log: SalatLog }>('/api/salat/nafl', vars);
        return data.log;
      } catch (err) {
        if (isNetworkError(err)) {
          enqueueSalatOp({ kind: 'nafl', vars });
          throw new OfflineQueuedError();
        }
        throw err;
      }
    },
    onMutate: async (vars) => {
      const key = ['salat', 'log', vars.date ?? localTodayStr()];
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<SalatLog>(key);
      qc.setQueryData<SalatLog>(key, (old) => {
        if (!old) return old;
        return {
          ...old,
          nafl: {
            completed: vars.completed,
            types: vars.types,
            rakat: vars.rakat,
            completedAt: vars.completed ? new Date().toISOString() : undefined,
          },
        };
      });
      return { previous, key };
    },
    onError: (err, _vars, context) => {
      if (err instanceof OfflineQueuedError) {
        toast("You're offline — this will sync automatically once you're back online.", {
          icon: '📶',
          id: 'salat-offline',
        });
        return;
      }
      if (context?.previous !== undefined) qc.setQueryData(context.key, context.previous);
    },
    onSettled: (_data, err, vars) => {
      if (err instanceof OfflineQueuedError) return;
      void qc.invalidateQueries({ queryKey: ['salat', 'log', vars.date ?? localTodayStr()] });
      void qc.invalidateQueries({ queryKey: ['salat', 'analytics'] });
    },
  });
}

export interface SalatDebt {
  owed: Record<PrayerId, number>;
  totalOwed: number;
  /** Civil date (YYYY-MM-DD) the current counting period started, or null
   * for a user with no debt doc yet. */
  since: string | null;
}

export function useSalatDebt() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['salat', 'debt'],
    queryFn: async () => {
      const { data } = await api.get<SalatDebt & { ok: boolean }>(
        `/api/salat/debt?today=${getTrackingDay()}`
      );
      return data;
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

export function useAdjustSalatDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { prayer: PrayerId; delta: number; date?: string }) => {
      const { data } = await api.patch<SalatDebt & { ok: boolean }>('/api/salat/debt/adjust', vars);
      return data;
    },
    onSuccess: (data) => {
      qc.setQueryData(['salat', 'debt'], data);
      void qc.invalidateQueries({ queryKey: ['salat', 'debtHistory'] });
    },
  });
}

export function useSetSalatDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { prayer: PrayerId; count: number; date?: string }) => {
      const { data } = await api.patch<SalatDebt & { ok: boolean }>('/api/salat/debt/set', vars);
      return data;
    },
    onSuccess: (data) => {
      qc.setQueryData(['salat', 'debt'], data);
      void qc.invalidateQueries({ queryKey: ['salat', 'debtHistory'] });
    },
  });
}

export interface SalatDebtHistoryWeek {
  weekStart: string;
  weekEnd: string;
  accumulated: number;
  paidBack: number;
}

export function useResetSalatDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { today?: string }) => {
      const { data } = await api.post<SalatDebt & { ok: boolean }>('/api/salat/debt/reset', vars);
      return data;
    },
    onSuccess: (data) => {
      qc.setQueryData(['salat', 'debt'], data);
      void qc.invalidateQueries({ queryKey: ['salat', 'debtHistory'] });
    },
  });
}

export function useSalatDebtHistory(days = 30, todayOverride?: string) {
  const user = useAuthStore((s) => s.user);
  // The window's END date — must follow the selected period (e.g. the last day
  // of a past month), not always today, or a past-month view charts the wrong days.
  const endDate = todayOverride ?? localTodayStr();
  return useQuery({
    queryKey: ['salat', 'debtHistory', days, endDate],
    queryFn: async () => {
      const { data } = await api.get<{ ok: boolean; weeks: SalatDebtHistoryWeek[] }>(
        `/api/salat/debt/history?days=${days}&today=${endDate}`
      );
      return data.weeks;
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

export interface KazaInsights {
  oldestOwed: { prayer: PrayerId; missedDate: string } | null;
  avgPayoffDays: number | null;
  itemizedOwedCount: number;
  itemizedPaidCount: number;
  perPrayer: Partial<
    Record<
      PrayerId,
      {
        owedCount: number;
        oldestOwedDate: string | null;
        avgPayoffDays: number | null;
        paidCount: number;
      }
    >
  >;
}

/** Derived from the itemized kaza ledger — only meaningful once at least a
 * few prayers have gone through the automatic missed/paid-back cycle, so
 * this quietly returns mostly-null data for a new tracker rather than an
 * error; the UI only shows itself once itemizedOwedCount/PaidCount > 0. */
export function useSalatDebtInsights() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['salat', 'debtInsights'],
    queryFn: async () => {
      const { data } = await api.get<{ ok: boolean } & KazaInsights>('/api/salat/debt/insights');
      return data;
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

export interface JourneyPhase {
  index: number;
  from: string;
  to: string | null;
  days: number;
  done: number;
  missed: number;
  kaza: number;
  completionRate: number;
  resetNote: string | null;
}

export function useSalatJourney(today?: string) {
  const user = useAuthStore((s) => s.user);
  const todayParam = today ?? localTodayStr();
  return useQuery({
    queryKey: ['salat', 'journey', todayParam],
    queryFn: async () => {
      const { data } = await api.get<{ ok: boolean; phases: JourneyPhase[] }>(
        `/api/salat/journey?today=${todayParam}`
      );
      return data.phases;
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
}

export function useResetSalat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { today: string; note?: string }) => {
      const { data } = await api.post<{ ok: boolean; resetDate: string }>('/api/salat/reset', vars);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['salat', 'analytics'] });
      void qc.invalidateQueries({ queryKey: ['salat', 'journey'] });
    },
  });
}

export function useSalatAnalytics(days = 30, todayOverride?: string) {
  const user = useAuthStore((s) => s.user);
  // The missed-prayer rollover sweep (ensureCaughtUp) this endpoint triggers
  // must use the Fajr-tracking day, not a civil-midnight date, so Isha prayed
  // after midnight isn't swept into "missed" before its window truly closes.
  const todayParam = todayOverride ?? getTrackingDay();
  return useQuery({
    queryKey: ['salat', 'analytics', days, todayParam],
    queryFn: async () => {
      const { data } = await api.get<SalatAnalytics & { ok: boolean }>(
        `/api/salat/analytics?days=${days}&today=${todayParam}`
      );
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
}

export interface IshaFajrCorrelation {
  available: boolean;
  earlyIshaFajrRate: number | null;
  lateIshaFajrRate: number | null;
  earlySampleSize: number;
  lateSampleSize: number;
}

/** Isha-time vs next-day Fajr on-time rate — derived from prayedAt data
 * already collected, no separate "log your bedtime" step needed. */
export function useSalatCorrelation() {
  const user = useAuthStore((s) => s.user);
  const today = getTrackingDay();
  const timezoneOffset = getUserTimezoneOffset();
  return useQuery({
    queryKey: ['salat', 'correlations', today, timezoneOffset],
    queryFn: async () => {
      const { data } = await api.get<IshaFajrCorrelation & { ok: boolean }>(
        `/api/salat/correlations?today=${today}&timezoneOffset=${timezoneOffset}`
      );
      return data;
    },
    enabled: !!user,
    staleTime: 30 * 60_000,
  });
}

// Replays queued prayer/nafl PATCHes in the order they were made — call this
// on 'online' (see App.tsx). Stops at the first still-failing request rather
// than skipping ahead, so a flaky reconnect doesn't reorder writes; a
// non-network failure (e.g. a since-invalidated request) is dropped instead
// of retried forever.
export async function replaySalatOutbox(qc: QueryClient): Promise<void> {
  const queue = peekSalatOutbox();
  if (!queue.length) return;

  let replayedAny = false;
  for (const op of queue) {
    try {
      if (op.kind === 'prayer') {
        await api.patch('/api/salat/prayer', op.vars);
      } else {
        await api.patch('/api/salat/nafl', op.vars);
      }
      removeSalatOp(op.id);
      replayedAny = true;
    } catch (err) {
      if (isNetworkError(err)) return; // still offline — leave the rest queued
      removeSalatOp(op.id); // real error (e.g. bad request) — don't retry forever
    }
  }

  if (replayedAny) {
    toast.success('Synced your offline prayer updates.', { icon: '✅', id: 'salat-offline-sync' });
  }
  void qc.invalidateQueries({ queryKey: ['salat'] });
}
