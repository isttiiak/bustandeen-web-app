import QuranLog, { IQuranLog } from '../models/QuranLog.js';
import QuranProfile, {
  IQuranProfile,
  QURAN_TOTAL_PAGES,
  QURAN_TOTAL_AYAT,
} from '../models/QuranProfile.js';
import QuranReadingSession from '../models/QuranReadingSession.js';
import { DEFAULT_TIMEZONE_OFFSET } from '../utils/timezone-flexible.js';

/** Unit math: 1 mushaf page ≈ 10 ayat (6236/604). Units = ayat-equivalents. */
const AYAT_PER_PAGE = 10;
export function unitsOf(log: { pages?: number; ayat?: number } | null | undefined): number {
  if (!log) return 0;
  return Math.round((log.ayat ?? 0) + (log.pages ?? 0) * AYAT_PER_PAGE);
}

function todayDateString(): string {
  return new Date().toISOString().substring(0, 10);
}

function shiftDateStr(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().substring(0, 10);
}

export async function getOrCreateProfile(userId: string): Promise<IQuranProfile> {
  let profile = await QuranProfile.findOne({ userId });
  if (!profile) profile = await QuranProfile.create({ userId });
  return profile;
}

export interface ReadResult {
  log: IQuranLog;
  profile: IQuranProfile;
  /** Set when this reading completed a khatm — the UI celebrates */
  khatmCompleted: boolean;
}

/**
 * Legacy page-based recording, kept for historical-data continuity and test
 * coverage of the pages+ayat unit math — NOT called by the current frontend,
 * which logs exclusively through addAyatReading (the v4 ayah engine) below.
 * `unitsOf()` above is what lets old page-based logs and new ayah-based logs
 * coexist in the same QuranLog document and combine correctly in analytics;
 * this function still writes valid data, it's just no longer the active path.
 *
 * Adds pages to the day's log (accumulating) and, when advancePosition is set,
 * moves the mushaf bookmark forward — completing a khatm when it crosses 604.
 */
export async function addReading(
  userId: string,
  date: string,
  pages: number,
  advancePosition: boolean
): Promise<ReadResult> {
  const log = await QuranLog.findOneAndUpdate(
    { userId, date },
    { $inc: { pages } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const profile = await getOrCreateProfile(userId);
  let khatmCompleted = false;

  if (advancePosition) {
    let pos = profile.currentPage + Math.round(pages);
    while (pos >= QURAN_TOTAL_PAGES) {
      pos -= QURAN_TOTAL_PAGES;
      profile.khatmCount += 1;
      khatmCompleted = true;
    }
    profile.currentPage = pos;
    await profile.save();
  }

  return { log, profile, khatmCompleted };
}

export interface AyatReadResult {
  log: IQuranLog;
  profile: IQuranProfile;
  khatmCompleted: boolean;
}

/**
 * v4 ayah engine: log `count` ayat for the day toward the daily goal/streak,
 * (khatam mode) advance the global-ayah bookmark — wrapping at 6236 completes
 * a khatm — and, when `completedSurah` is set, credit ONE completion of that
 * surah toward the "top surahs" list. Reading duas/bundles passes count 0 and
 * completedSurah false, so they never touch the goal (Istiak's spec).
 */
export async function addAyatReading(
  userId: string,
  input: {
    date: string;
    count: number;
    surah?: number;
    advanceKhatm?: boolean;
    completedSurah?: boolean;
  }
): Promise<AyatReadResult> {
  const { date, count, surah, advanceKhatm, completedSurah } = input;

  const log =
    count > 0
      ? await QuranLog.findOneAndUpdate(
          { userId, date },
          { $inc: { ayat: count }, $setOnInsert: { pages: 0 } },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        )
      : await QuranLog.findOneAndUpdate(
          { userId, date },
          { $setOnInsert: { pages: 0, ayat: 0 } },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

  const profile = await getOrCreateProfile(userId);
  // Top-surah counter now tracks how many times a surah was READ TO THE END,
  // not raw ayat — a far more meaningful "most-read" signal.
  if (completedSurah && surah && surah >= 1 && surah <= 114) {
    const key = String(surah);
    profile.surahCounts.set(key, (profile.surahCounts.get(key) ?? 0) + 1);
  }

  let khatmCompleted = false;
  if (advanceKhatm) {
    let pos = profile.currentAyah + count;
    while (pos >= QURAN_TOTAL_AYAT) {
      pos -= QURAN_TOTAL_AYAT;
      profile.khatmCount += 1;
      khatmCompleted = true;
    }
    profile.currentAyah = pos;
    profile.currentPage = Math.min(
      QURAN_TOTAL_PAGES - 1,
      Math.floor(pos / (QURAN_TOTAL_AYAT / QURAN_TOTAL_PAGES))
    );
  }
  await profile.save();

  return { log, profile, khatmCompleted };
}

/** Toggle a saved ayah. Returns the new bookmark list (capped at 100). */
export async function toggleBookmark(
  userId: string,
  surah: number,
  ayah: number
): Promise<Array<{ surah: number; ayah: number }>> {
  const profile = await getOrCreateProfile(userId);
  const i = profile.bookmarks.findIndex((b) => b.surah === surah && b.ayah === ayah);
  if (i >= 0) profile.bookmarks.splice(i, 1);
  else {
    profile.bookmarks.unshift({ surah, ayah });
    if (profile.bookmarks.length > 100) profile.bookmarks.length = 100;
  }
  profile.markModified('bookmarks');
  await profile.save();
  return profile.bookmarks;
}

/** Daily units for the analytics tab (last N days, oldest first). */
export async function getHistory(
  userId: string,
  days: number,
  today?: string
): Promise<Array<{ date: string; ayat: number; pages: number; units: number }>> {
  const end = today ?? todayDateString();
  const since = shiftDateStr(end, -(days - 1));
  const logs = await QuranLog.find({ userId, date: { $gte: since, $lte: end } })
    .select('date pages ayat')
    .sort({ date: 1 });
  return logs.map((l) => ({
    date: l.date,
    ayat: l.ayat ?? 0,
    pages: l.pages ?? 0,
    units: unitsOf(l),
  }));
}

export interface QuranProfileUpdate {
  dailyGoalPages?: number;
  currentPage?: number;
  dailyGoalAyat?: number;
  currentAyah?: number;
  arabicFont?: 'clean' | 'naskh' | 'uthmani';
  fontArabicPx?: number;
  fontTranslationPx?: number;
  fontTranslitPx?: number;
  fontTafsirPx?: number;
  translitEnabled?: boolean;
  listenCountsAsAyat?: boolean;
  reciterId?: string;
  translations?: string[];
}

const DISPLAY_PREF_KEYS = [
  'arabicFont',
  'fontArabicPx',
  'fontTranslationPx',
  'fontTranslitPx',
  'fontTafsirPx',
  'translitEnabled',
  'listenCountsAsAyat',
  'reciterId',
  'translations',
] as const satisfies ReadonlyArray<keyof QuranProfileUpdate>;

export async function updateProfile(
  userId: string,
  input: QuranProfileUpdate
): Promise<IQuranProfile> {
  const profile = await getOrCreateProfile(userId);
  if (input.dailyGoalPages !== undefined) profile.dailyGoalPages = input.dailyGoalPages;
  if (input.currentPage !== undefined) profile.currentPage = input.currentPage;
  if (input.dailyGoalAyat !== undefined) profile.dailyGoalAyat = input.dailyGoalAyat;
  if (input.currentAyah !== undefined) {
    profile.currentAyah = input.currentAyah;
    profile.currentPage = Math.min(
      QURAN_TOTAL_PAGES - 1,
      Math.floor(input.currentAyah / (QURAN_TOTAL_AYAT / QURAN_TOTAL_PAGES))
    );
  }
  if (input.arabicFont !== undefined) profile.arabicFont = input.arabicFont;
  if (input.fontArabicPx !== undefined) profile.fontArabicPx = input.fontArabicPx;
  if (input.fontTranslationPx !== undefined) profile.fontTranslationPx = input.fontTranslationPx;
  if (input.fontTranslitPx !== undefined) profile.fontTranslitPx = input.fontTranslitPx;
  if (input.fontTafsirPx !== undefined) profile.fontTafsirPx = input.fontTafsirPx;
  if (input.translitEnabled !== undefined) profile.translitEnabled = input.translitEnabled;
  if (input.listenCountsAsAyat !== undefined) profile.listenCountsAsAyat = input.listenCountsAsAyat;
  if (input.reciterId !== undefined) profile.reciterId = input.reciterId;
  if (input.translations !== undefined) profile.translations = input.translations;
  if (DISPLAY_PREF_KEYS.some((k) => input[k] !== undefined)) profile.displayPrefsSet = true;
  await profile.save();
  return profile;
}

/** Save (or clear with ayah 0) the per-surah reader resume position —
 * server-side so "continue where you left off" agrees across devices. */
export async function setResume(userId: string, surah: number, ayah: number): Promise<void> {
  const profile = await getOrCreateProfile(userId);
  if (ayah <= 0) profile.readerPos.delete(String(surah));
  else profile.readerPos.set(String(surah), ayah);
  profile.markModified('readerPos');
  await profile.save();
}

/** Toggle a curated dua in the saved list; returns the new list. */
export async function toggleDuaBookmark(userId: string, duaId: string): Promise<string[]> {
  const profile = await getOrCreateProfile(userId);
  const i = profile.savedDuas.indexOf(duaId);
  if (i >= 0) profile.savedDuas.splice(i, 1);
  else if (profile.savedDuas.length < 100) profile.savedDuas.push(duaId);
  await profile.save();
  return profile.savedDuas;
}

/** Explicitly begin the khatam journey (opt-in, Istiak's spec). */
export async function startKhatam(userId: string): Promise<IQuranProfile> {
  const profile = await getOrCreateProfile(userId);
  if (!profile.khatamStartedAt) {
    profile.khatamStartedAt = new Date();
    await profile.save();
  }
  return profile;
}

/** Reset the khatam journey: bookmark back to the very start, journey
 * un-started. Completed khatm COUNT is history and stays. */
export async function resetKhatam(userId: string): Promise<IQuranProfile> {
  const profile = await getOrCreateProfile(userId);
  profile.currentAyah = 0;
  profile.currentPage = 0;
  profile.khatamStartedAt = null;
  await profile.save();
  return profile;
}

/** Reset reading progress: zero counters and positions but keep logs,
 *  bookmarks, savedDuas. Goal + khatam stay — reset those separately. */
export async function resetReading(userId: string): Promise<IQuranProfile> {
  const profile = await getOrCreateProfile(userId);
  profile.surahCounts = new Map();
  profile.readerPos = new Map();
  await profile.save();
  return profile;
}

export interface QuranSummary {
  profile: {
    dailyGoalPages: number;
    currentPage: number;
    khatmCount: number;
    totalPages: number; // 604
    dailyGoalAyat: number;
    currentAyah: number;
    totalAyat: number; // 6236
    khatamStartedAt: string | null;
    readerPos: Record<string, number>;
    savedDuas: string[];
    arabicFont: 'clean' | 'naskh' | 'uthmani';
    fontArabicPx: number;
    fontTranslationPx: number;
    fontTranslitPx: number;
    fontTafsirPx: number;
    translitEnabled: boolean;
    listenCountsAsAyat: boolean;
    reciterId: string;
    translations: string[];
    displayPrefsSet: boolean;
  };
  todayPages: number;
  /** Today's ayat-equivalents (ayat + pages·10) — the v4 goal/streak unit */
  todayAyat: number;
  goalMet: boolean;
  streak: number;
  bestStreak: number;
  last7: Array<{ date: string; pages: number; units: number }>;
  stats: { last30Pages: number; allTimePages: number; last30Units: number; allTimeUnits: number };
  /** Average units/day over the last 7 days; null when no recent reading */
  pace: number | null;
  /** Estimated days to finish the current khatm at the current pace */
  estDaysToKhatm: number | null;
  /** Top-5 most-completed surahs (times read to the end) */
  topSurahs: Array<{ surah: number; completions: number }>;
  bookmarks: Array<{ surah: number; ayah: number }>;
}

export async function getSummary(userId: string, today?: string): Promise<QuranSummary> {
  const end = today ?? todayDateString();
  const windowSince = shiftDateStr(end, -364);

  const [profile, logs, allTimeAgg] = await Promise.all([
    getOrCreateProfile(userId),
    QuranLog.find({ userId, date: { $gte: windowSince, $lte: end } })
      .select('date pages ayat')
      .sort({ date: 1 }),
    QuranLog.aggregate([
      { $match: { userId } },
      {
        $group: { _id: null, pages: { $sum: '$pages' }, ayat: { $sum: { $ifNull: ['$ayat', 0] } } },
      },
    ]) as Promise<Array<{ _id: null; pages: number; ayat: number }>>,
  ]);

  const byDate = new Map(logs.map((l) => [l.date, unitsOf(l)]));
  const pagesByDate = new Map(logs.map((l) => [l.date, l.pages ?? 0]));
  const todayPages = pagesByDate.get(end) ?? 0;
  const todayAyat = byDate.get(end) ?? 0;

  // Streak with grace: allow a single-day gap (same rule as zikr). Missing
  // ONE day keeps the chain alive if the surrounding days are read; missing
  // TWO consecutive days breaks it.
  let streak = 0;
  const hasReading = (d: string) => (byDate.get(d) ?? 0) > 0;
  {
    let misses = 0;
    let cursor = hasReading(end) ? end : shiftDateStr(end, -1);
    for (let i = 0; i < 366; i++) {
      if (hasReading(cursor)) {
        streak++;
        misses = 0;
      } else {
        misses++;
        if (misses >= 2) break;
      }
      cursor = shiftDateStr(cursor, -1);
    }
  }

  let bestStreak = 0;
  let run = 0;
  let bestMisses = 0;
  for (let i = 364; i >= 0; i--) {
    const d = shiftDateStr(end, -i);
    if (hasReading(d)) {
      run++;
      bestMisses = 0;
    } else {
      bestMisses++;
      if (bestMisses >= 2) run = 0;
    }
    if (run > bestStreak) bestStreak = run;
  }

  const last7: Array<{ date: string; pages: number; units: number }> = [];
  let last7Sum = 0;
  for (let i = 6; i >= 0; i--) {
    const d = shiftDateStr(end, -i);
    const u = byDate.get(d) ?? 0;
    last7.push({ date: d, pages: pagesByDate.get(d) ?? 0, units: u });
    last7Sum += u;
  }

  let last30Pages = 0;
  let last30Units = 0;
  const since30 = shiftDateStr(end, -29);
  for (const l of logs) {
    if (l.date >= since30) {
      last30Pages += l.pages ?? 0;
      last30Units += unitsOf(l);
    }
  }

  const pace = last7Sum > 0 ? Math.round((last7Sum / 7) * 10) / 10 : null;
  const remainingAyat = QURAN_TOTAL_AYAT - profile.currentAyah;
  const estDaysToKhatm = pace && pace > 0 ? Math.ceil(remainingAyat / pace) : null;

  const topSurahs = [...profile.surahCounts.entries()]
    .map(([k, v]) => ({ surah: Number(k), completions: v }))
    .filter((t) => t.completions > 0)
    .sort((a, b) => b.completions - a.completions)
    .slice(0, 5);

  const allPages = allTimeAgg[0]?.pages ?? 0;
  const allAyat = allTimeAgg[0]?.ayat ?? 0;

  return {
    profile: {
      dailyGoalPages: profile.dailyGoalPages,
      currentPage: profile.currentPage,
      khatmCount: profile.khatmCount,
      totalPages: QURAN_TOTAL_PAGES,
      dailyGoalAyat: profile.dailyGoalAyat,
      currentAyah: profile.currentAyah,
      totalAyat: QURAN_TOTAL_AYAT,
      khatamStartedAt: profile.khatamStartedAt ? profile.khatamStartedAt.toISOString() : null,
      readerPos: Object.fromEntries(profile.readerPos ?? new Map()),
      savedDuas: profile.savedDuas ?? [],
      arabicFont: profile.arabicFont,
      fontArabicPx: profile.fontArabicPx,
      fontTranslationPx: profile.fontTranslationPx,
      fontTranslitPx: profile.fontTranslitPx,
      fontTafsirPx: profile.fontTafsirPx,
      translitEnabled: profile.translitEnabled,
      listenCountsAsAyat: profile.listenCountsAsAyat,
      reciterId: profile.reciterId,
      translations: profile.translations,
      displayPrefsSet: profile.displayPrefsSet,
    },
    todayPages,
    todayAyat,
    // goal 0 = no goal set — never "met"
    goalMet: profile.dailyGoalAyat > 0 && todayAyat >= profile.dailyGoalAyat,
    streak,
    bestStreak,
    last7,
    stats: {
      last30Pages,
      allTimePages: allPages,
      last30Units,
      allTimeUnits: Math.round(allAyat + allPages * AYAT_PER_PAGE),
    },
    pace,
    estDaysToKhatm,
    topSurahs,
    bookmarks: profile.bookmarks,
  };
}

// ── Tafsir (authentic, sourced from quran.com — NOT AI) ──────────────────────
/** Whitelisted tafsir editions (id → {name, language, slug}) available to the
 * reader. Sourced from api.quran.com; text is real scholarly tafsir, never
 * AI-generated. */
export const TAFSIR_EDITIONS: Record<
  number,
  { name: string; language: 'en' | 'bn'; slug: string }
> = {
  169: { name: 'Ibn Kathir (Abridged)', language: 'en', slug: 'en-tafisr-ibn-kathir' },
  168: { name: "Ma'arif al-Qur'an", language: 'en', slug: 'en-tafsir-maarif-ul-quran' },
  817: { name: 'Tazkirul Quran', language: 'en', slug: 'tazkirul-quran-en' },
  164: { name: 'Tafsir Ibn Kathir (Bangla)', language: 'bn', slug: 'bn-tafseer-ibn-e-kaseer' },
  165: { name: 'Ahsanul Bayaan (Bangla)', language: 'bn', slug: 'bn-tafsir-ahsanul-bayaan' },
  166: { name: 'Abu Bakr Zakaria (Bangla)', language: 'bn', slug: 'bn-tafsir-abu-bakr-zakaria' },
};

/** Turn tafsir HTML into readable plain text (paragraphs preserved). */
function htmlToText(html: string): string {
  return html
    .replace(/<\s*(br|\/p|\/div|\/h\d)\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 12000);
}

export interface TafsirResult {
  text: string;
  resourceName: string;
  editionId: number;
  language: 'en' | 'bn';
  url: string;
}

export async function getTafsir(
  surah: number,
  ayah: number,
  editionId: number
): Promise<TafsirResult> {
  const meta = TAFSIR_EDITIONS[editionId];
  if (!meta) throw Object.assign(new Error('Unknown tafsir edition'), { status: 400 });
  const res = await fetch(
    `https://api.quran.com/api/v4/tafsirs/${editionId}/by_ayah/${surah}:${ayah}`
  );
  if (!res.ok) throw Object.assign(new Error('Tafsir source unavailable'), { status: 502 });
  const data = (await res.json()) as { tafsir?: { text?: string; resource_name?: string } };
  const text = htmlToText(data.tafsir?.text ?? '');
  return {
    text: text || 'No tafsir text is available for this āyah in this edition.',
    resourceName: data.tafsir?.resource_name ?? meta.name,
    editionId,
    language: meta.language,
    url: `https://quran.com/${surah}:${ayah}/tafsirs/${meta.slug}`,
  };
}

export async function deleteAllUserQuranData(userId: string): Promise<{ deletedCount: number }> {
  const result = await QuranLog.deleteMany({ userId });
  await QuranProfile.deleteOne({ userId });
  await QuranReadingSession.deleteMany({ userId });
  return { deletedCount: result.deletedCount ?? 0 };
}

const MAX_SESSION_SEC = 6 * 3600;
// Sessions below this are hidden from the history list (accidental taps into
// the reader, or a page mounted for a moment while navigating through) —
// their credited seconds still count toward the daily total either way.
const MIN_SESSION_SEC_TO_LIST = 10;

export interface QuranSessionSavePayload {
  clientSessionId: string;
  date: string;
  startedAt: Date;
  endedAt: Date;
  activeDurationSec: number;
  ayahCount: number;
  pagesRead: number;
  surahs: number[];
  source: 'read' | 'listen';
}

/**
 * Upserts the client's in-progress (or just-finished) reading session by
 * `clientSessionId` — called periodically while reading and once more on
 * teardown, so it's idempotent-safe on retries. `activeDurationSec` is the
 * SESSION'S RUNNING TOTAL, not a delta; the delta since the last save is what
 * gets credited to that day's QuranLog, so a crediting bug here can't double
 * count even if the client resends the same total.
 */
export async function saveReadingSession(
  userId: string,
  payload: QuranSessionSavePayload
): Promise<{ activeDurationSec: number }> {
  const elapsedSec = Math.max(0, (payload.endedAt.getTime() - payload.startedAt.getTime()) / 1000);
  const activeDurationSec = Math.min(payload.activeDurationSec, elapsedSec, MAX_SESSION_SEC);

  const existing = await QuranReadingSession.findOne({
    userId,
    clientSessionId: payload.clientSessionId,
  }).select('activeDurationSec');
  const prevDuration = existing?.activeDurationSec ?? 0;
  const delta = Math.max(0, activeDurationSec - prevDuration);

  await QuranReadingSession.findOneAndUpdate(
    { userId, clientSessionId: payload.clientSessionId },
    {
      $setOnInsert: {
        userId,
        clientSessionId: payload.clientSessionId,
        startedAt: payload.startedAt,
        source: payload.source,
      },
      $set: {
        date: payload.date,
        endedAt: payload.endedAt,
        activeDurationSec,
        ayahCount: payload.ayahCount,
        pagesRead: payload.pagesRead,
        surahs: payload.surahs.slice(0, 50),
      },
    },
    { upsert: true, setDefaultsOnInsert: true }
  );

  if (delta > 0) {
    await QuranLog.findOneAndUpdate(
      { userId, date: payload.date },
      { $inc: { durationSec: delta } },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }

  return { activeDurationSec };
}

export interface QuranReadingSessionSummary {
  start: Date;
  end: Date;
  activeDurationSec: number;
  ayahCount: number;
  pagesRead: number;
  surahs: number[];
  source: 'read' | 'listen';
}

/** Sessions for a given tracking day — a date-picker driven history list,
 * mirroring zikr.service.ts's getSessionsForDay. Reading and listening
 * sessions share one collection and are returned together, tagged by
 * `source`, so nothing is missing from the history — just distinguishable. */
export async function getReadingSessionsForDay(
  userId: string,
  dateStr: string
): Promise<QuranReadingSessionSummary[]> {
  const sessions = await QuranReadingSession.find({ userId, date: dateStr })
    .sort({ startedAt: 1 })
    .select('startedAt endedAt activeDurationSec ayahCount pagesRead surahs source');

  return sessions
    .filter((s) => s.activeDurationSec >= MIN_SESSION_SEC_TO_LIST)
    .map((s) => ({
      start: s.startedAt,
      end: s.endedAt,
      activeDurationSec: s.activeDurationSec,
      ayahCount: s.ayahCount,
      pagesRead: s.pagesRead,
      surahs: s.surahs,
      source: s.source ?? 'read',
    }));
}

function offsetToUtcTzString(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `${sign}${hh}:${mm}`;
}

/** Total ACTIVE MINUTES by local hour-of-day (0-23) over the last `days`,
 * across both reading and listening sessions — "when during the day do I
 * spend time with the Quran?" mirrors zikr.service.ts's
 * getTimeOfDayDistribution. A session's whole duration is attributed to the
 * hour it STARTED in (not split across the hours it spans) — a deliberate
 * simplification, fine for typical session lengths. */
export async function getQuranTimeOfDayDistribution(
  userId: string,
  days: number = 30,
  timezoneOffset: number = DEFAULT_TIMEZONE_OFFSET
): Promise<Array<{ hour: number; total: number }>> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = (await QuranReadingSession.aggregate([
    { $match: { userId, startedAt: { $gte: since } } },
    {
      $group: {
        _id: { $hour: { date: '$startedAt', timezone: offsetToUtcTzString(timezoneOffset) } },
        totalSec: { $sum: '$activeDurationSec' },
      },
    },
  ])) as Array<{ _id: number; totalSec: number }>;

  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, total: 0 }));
  for (const r of rows) {
    if (r._id >= 0 && r._id < 24) hours[r._id]!.total = Math.round(r.totalSec / 60);
  }
  return hours;
}
