/**
 * Excel report (U6): every sheet is built from the version-3 backup file
 * (GET /api/user/export), so the report and the backup always hold the same
 * data. Pure: returns sheet rows; Settings writes the .xlsx with SheetJS.
 *
 * Rayhanah is deliberately left out (Istiak, 2026-10-10): spreadsheets get
 * shared more casually than a backup file. Read-only `records` stay out too.
 */

type Row = Record<string, string | number | null>;
export interface Sheet {
  name: string;
  rows: Row[];
}
type T = (key: string, opts?: Record<string, unknown>) => string;

// Loose view of the backup file: the server owns its shape (backup.service.ts).
type Doc = Record<string, unknown>;
interface ExcelSource {
  exportedAt?: string;
  profile?: Doc | null;
  settings?: {
    dayStartMode?: string;
    hijriOffset?: number;
    aiEnabled?: boolean;
    app?: Record<string, string>;
  };
  zikr?: {
    totalCount?: number;
    zikrTotals?: Record<string, number>;
    goal?: { dailyTarget?: number } | null;
    streak?: { currentStreak?: number; longestStreak?: number } | null;
    daily?: Array<{ date: string; zikrType: string; count: number }>;
  };
  salat?: {
    logs?: Array<{
      date: string;
      prayers?: Record<string, { status?: string; location?: string }>;
      nafl?: { completed?: boolean };
    }>;
    resetDate?: string | null;
    kaza?: {
      debt?: { owed?: Record<string, number> } | null;
      units?: Array<{ prayer: string; missedDate: string; status: string; paidAt?: string }>;
    };
  };
  fasting?: {
    profile?: { qadaOwed?: number; vows?: Array<{ title: string; targetDays: number }> } | null;
    logs?: Array<{ date: string; category: string; voluntaryKind?: string; status: string }>;
  };
  adhkar?: { days?: Array<{ date: string; morningAt?: string; eveningAt?: string }> };
  quran?: {
    profile?: { khatmCount?: number; currentAyah?: number; dailyGoalAyat?: number } | null;
    logs?: Array<{ date: string; pages?: number; ayat?: number; durationSec?: number }>;
    sessions?: Array<{ date: string; startedAt: string; endedAt: string; source?: string }>;
  };
  hifz?: { entries?: Array<{ surah: number; ayah: number; state: string; dueDate: string }> };
}

export const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

const day = (iso: unknown): string => (typeof iso === 'string' ? iso.slice(0, 10) : '');
const time = (iso: unknown): string =>
  typeof iso === 'string' && iso.length > 15 ? new Date(iso).toLocaleString() : '';
const minutes = (from: string, to: string): number =>
  Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60_000));

export function buildExcelSheets(raw: Record<string, unknown>, t: T): Sheet[] {
  const file = raw as ExcelSource;
  const s = (k: string) => t(`settings.xlsx.${k}`);
  const status = (v: string | undefined) =>
    v ? t(`settings.xlsx.status.${v}`, { defaultValue: v }) : '';
  const prayer = (p: string) => t(`settings.xlsx.prayer.${p}`, { defaultValue: p });

  const zikrDaily = file.zikr?.daily ?? [];
  const salatLogs = file.salat?.logs ?? [];
  const fastingLogs = file.fasting?.logs ?? [];
  const quranLogs = file.quran?.logs ?? [];
  const sessions = file.quran?.sessions ?? [];
  const units = file.salat?.kaza?.units ?? [];
  const hifz = file.hifz?.entries ?? [];
  const adhkar = file.adhkar?.days ?? [];

  const prayerCounts = { completed: 0, kaza: 0, missed: 0 };
  for (const l of salatLogs)
    for (const p of PRAYERS) {
      const st = l.prayers?.[p]?.status;
      if (st === 'completed' || st === 'kaza' || st === 'missed') prayerCounts[st]++;
    }
  const owed = file.salat?.kaza?.debt?.owed ?? {};
  const owedTotal = PRAYERS.reduce((n, p) => n + (owed[p] ?? 0), 0);
  const quranPages = quranLogs.reduce((n, l) => n + (l.pages ?? 0), 0);
  const quranAyat = quranLogs.reduce((n, l) => n + (l.ayat ?? 0), 0);
  const quranMinutes = Math.round(quranLogs.reduce((n, l) => n + (l.durationSec ?? 0), 0) / 60);

  const overview: Row[] = [
    [s('exportedAt'), file.exportedAt ? new Date(file.exportedAt).toLocaleString() : ''],
    [s('name'), (file.profile?.displayName as string) ?? ''],
    [s('zikrTotal'), file.zikr?.totalCount ?? 0],
    [s('zikrDays'), new Set(zikrDaily.map((d) => day(d.date))).size],
    [s('zikrGoal'), file.zikr?.goal?.dailyTarget ?? ''],
    [s('zikrStreak'), file.zikr?.streak?.currentStreak ?? 0],
    [s('zikrBest'), file.zikr?.streak?.longestStreak ?? 0],
    [s('salatDays'), salatLogs.length],
    [s('salatDone'), prayerCounts.completed],
    [s('salatKaza'), prayerCounts.kaza],
    [s('salatMissed'), prayerCounts.missed],
    [s('kazaOwed'), owedTotal],
    [s('fastsDone'), fastingLogs.filter((l) => l.status === 'completed').length],
    [s('qadaOwed'), file.fasting?.profile?.qadaOwed ?? 0],
    [s('khatms'), file.quran?.profile?.khatmCount ?? 0],
    [s('quranPages'), quranPages],
    [s('quranAyat'), quranAyat],
    [s('quranMinutes'), quranMinutes],
    [s('hifzAyat'), hifz.length],
    [s('adhkarMorning'), adhkar.filter((d) => d.morningAt).length],
    [s('adhkarEvening'), adhkar.filter((d) => d.eveningAt).length],
  ].map(([k, v]) => ({ [s('item')]: k, [s('value')]: v }));

  const settingsRows: Row[] = [
    [s('dayStart'), file.settings?.dayStartMode ?? ''],
    [s('hijriOffset'), file.settings?.hijriOffset ?? 0],
    [s('naseeh'), file.settings?.aiEnabled ? s('on') : s('off')],
    [s('salatReset'), file.salat?.resetDate ?? ''],
    ...Object.entries(file.settings?.app ?? {})
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k.replace(/^bustandeen_/, ''), v] as [string, string]),
  ].map(([k, v]) => ({ [s('setting')]: k, [s('value')]: v }));

  const sheets: Sheet[] = [
    { name: s('sheetOverview'), rows: overview },
    {
      name: s('sheetZikrDaily'),
      rows: zikrDaily.map((d) => ({
        [s('date')]: day(d.date),
        [s('zikr')]: d.zikrType,
        [s('count')]: d.count,
      })),
    },
    {
      name: s('sheetZikrTotals'),
      rows: Object.entries(file.zikr?.zikrTotals ?? {})
        .sort((a, b) => b[1] - a[1])
        .map(([z, n]) => ({ [s('zikr')]: z, [s('lifetime')]: n })),
    },
    {
      name: s('sheetSalat'),
      rows: salatLogs.map((l) => ({
        [s('date')]: l.date,
        ...Object.fromEntries(PRAYERS.map((p) => [prayer(p), status(l.prayers?.[p]?.status)])),
        [s('nafl')]: l.nafl?.completed ? s('yes') : '',
      })),
    },
    {
      name: s('sheetKaza'),
      rows: units.map((u) => ({
        [s('prayerCol')]: prayer(u.prayer),
        [s('missedOn')]: u.missedDate,
        [s('statusCol')]: status(u.status),
        [s('paidOn')]: day(u.paidAt),
      })),
    },
    {
      name: s('sheetFasting'),
      rows: fastingLogs.map((l) => ({
        [s('date')]: l.date,
        [s('category')]: l.category,
        [s('kind')]: l.voluntaryKind ?? '',
        [s('statusCol')]: status(l.status),
      })),
    },
    {
      name: s('sheetQuran'),
      rows: quranLogs.map((l) => ({
        [s('date')]: l.date,
        [s('pages')]: l.pages ?? 0,
        [s('ayat')]: l.ayat ?? 0,
        [s('minutes')]: Math.round((l.durationSec ?? 0) / 60),
      })),
    },
    {
      name: s('sheetSessions'),
      rows: sessions.map((x) => ({
        [s('date')]: x.date,
        [s('start')]: time(x.startedAt),
        [s('minutes')]: minutes(x.startedAt, x.endedAt),
        [s('source')]: x.source ?? 'read',
      })),
    },
    {
      name: s('sheetHifz'),
      rows: hifz.map((h) => ({
        [s('surah')]: h.surah,
        [s('ayah')]: h.ayah,
        [s('state')]: h.state,
        [s('due')]: h.dueDate,
      })),
    },
    {
      name: s('sheetAdhkar'),
      rows: adhkar.map((d) => ({
        [s('date')]: d.date,
        [s('morning')]: time(d.morningAt),
        [s('evening')]: time(d.eveningAt),
      })),
    },
    { name: s('sheetSettings'), rows: settingsRows },
  ];
  // Excel caps sheet names at 31 characters.
  return sheets.filter((sh) => sh.rows.length).map((sh) => ({ ...sh, name: sh.name.slice(0, 31) }));
}
