import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTranslation, Trans } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedBackground from '../components/AnimatedBackground.js';
import TabNav from '../components/TabNav.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { celebrateSmall, celebrateAllPrayers } from '../utils/celebrate.js';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { getTrackingDay } from '../utils/trackingDay.js';
import {
  useSalatLog,
  useUpdatePrayer,
  useUpdateNafl,
  useSalatAnalytics,
  useSalatDebt,
  useSetSalatDebt,
  PrayerId,
  PrayerStatus,
  PrayerLocation,
  NaflType,
  NAFL_TYPE_META,
  SELECTABLE_NAFL_TYPES,
  MISSED_REASONS,
  MissedReason,
} from '../hooks/useSalatLog.js';
import {
  PRAYER_META,
  calcPrayerTimes,
  getCurrentAndNextPrayer,
  getPrayerEndTime,
  formatTime,
  translateSalatName,
} from '../utils/prayerTimes.js';
import { getHijriDate, formatHijriDate } from '../utils/islamicCalendar.js';
import { useCycleActive } from '../hooks/useCycle.js';
import { useFastingHistory, useUpsertFastingLog } from '../hooks/useFasting.js';
import ExcusedCard from '../components/ExcusedCard.js';
import SalatSettings from '../components/SalatSettings.js';
import Seo from '../components/Seo.js';
import { useZikrStore } from '../store/useZikrStore.js';
import {
  getTasbihMode,
  tasbihModeMeta,
  tasbihDeltas,
  AYATUL_KURSI_ZIKR,
  getAutoCountDhikr,
  wasDhikrCredited,
  setDhikrCredited,
  getShowSunnahGuide,
  getShowNaflGuide,
} from '../utils/salatPrefs.js';
import { recitationsFor, recitationHref } from '../utils/postSalatQuran.js';
import { SUNNAH_GUIDE, JUMUAH_SUNNAH_GUIDE, type SunnahSlot } from '../utils/sunnahGuide.js';
import { getFridayHour, FRIDAY_HOUR_REF } from '../utils/fridayHour.js';
import { formatLocaleDate, formatLocaleNumber } from '../utils/localeDate.js';
import { translateReference } from '../utils/localeReference.js';
import MusafirBanner from '../components/MusafirBanner.js';
import {
  useMusafir,
  musafirAppliesOn,
  isQasrPrayer,
  jamAllowed,
  jamPartner,
  FARD_RAKAT,
  travelRakat,
} from '../utils/musafir.js';

// ─── helpers ────────────────────────────────────────────────────────────────

// Nafl is prayed in pairs — two rak'ahs is the smallest unit here. (Witr, the
// one odd-numbered prayer, is NOT tracked in this section: it belongs to Isha,
// not to voluntary rak'ah counting — Istiak's spec.)
const MIN_RAKAT = 2;

function isRamadanNow(): boolean {
  try {
    const month = parseInt(
      new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', { month: 'numeric' }).format(
        new Date()
      ),
      10
    );
    return month === 9;
  } catch {
    return false;
  }
}

function todayStr() {
  // Fajr boundary: before today's Fajr the "tracking day" is still yesterday.
  // Isha at 2 AM and Tahajjud before Fajr belong to the closing Islamic day.
  // Fallback to civil midnight when no location is saved.
  return getTrackingDay();
}
function offsetDate(base: string, delta: number): string {
  const d = new Date(base + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function isFuturePrayer(
  prayerId: string,
  todayTimes: Record<string, Date> | null | undefined
): boolean {
  if (!todayTimes) return false;
  const t = todayTimes[prayerId];
  return !!t && t > new Date();
}
function isCurrentPrayer(prayerId: string, currentId: string | undefined): boolean {
  return prayerId === currentId;
}

/** One before/after sunnah-rak'ah guidance row — same visual contract as the
 * existing Witr reminder block (gold accent), just re-colored per emphasis:
 * emerald for Sunnah Mu'akkadah (confirmed), info-blue for the lighter
 * ghair-mu'akkadah/nafl set, so the two toggles read as visually distinct. */
function SunnahGuidanceRow({
  slot,
  position,
  lang,
}: {
  slot: SunnahSlot;
  position: 'before' | 'after';
  lang: string;
}) {
  const { t } = useTranslation();
  const muakkadah = slot.emphasis === 'muakkadah';
  // Tailwind's JIT scanner needs literal class strings — a templated
  // `border-${accent}/20` would never get generated into the built CSS.
  const cls = muakkadah
    ? {
        wrap: 'px-3 py-2.5 border-t border-brand-emerald/20 flex items-start gap-2 bg-brand-emerald/5',
        title: 'text-brand-emerald font-bold text-xs leading-tight',
        sub: 'text-brand-emerald/70 font-normal',
        link: 'text-brand-emerald/50 text-xs underline hover:text-brand-emerald/80 transition-colors mt-0.5 inline-block',
      }
    : {
        wrap: 'px-3 py-2.5 border-t border-brand-info/20 flex items-start gap-2 bg-brand-info/5',
        title: 'text-brand-info font-bold text-xs leading-tight',
        sub: 'text-brand-info/70 font-normal',
        link: 'text-brand-info/50 text-xs underline hover:text-brand-info/80 transition-colors mt-0.5 inline-block',
      };
  return (
    <div className={cls.wrap}>
      <span className="text-base shrink-0">{position === 'before' ? '⏮️' : '⏭️'}</span>
      <div className="min-w-0">
        <p className={cls.title}>
          {position === 'before'
            ? t('salatTracker.sunnahBefore', '{{rakat}} rakʿah sunnah before', {
                rakat: slot.rakat,
              })
            : t('salatTracker.sunnahAfter', '{{rakat}} rakʿah sunnah after', { rakat: slot.rakat })}
          {' · '}
          <span className={cls.sub}>
            {muakkadah
              ? t('salatTracker.sunnahMuakkadah', 'Muʾakkadah — confirmed')
              : t('salatTracker.sunnahGhairMuakkadah', 'Nafl — recommended')}
          </span>
        </p>
        <p className="text-white/30 text-xs leading-relaxed mt-0.5">{slot.note}</p>
        <a
          href={slot.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={cls.link}
        >
          📖 {translateReference(slot.source, lang)} · {translateReference(slot.grade, lang)}
        </a>
      </div>
    </div>
  );
}
function weekDotColor(completed: number): string {
  if (completed >= 5) return '#10b981'; // brand-emerald
  if (completed >= 3) return '#c9a96e'; // brand-gold
  if (completed >= 1) return '#f59e0b'; // amber
  return '#ef4444'; // red — logged nothing that day
}

function friendlyDate(dateStr: string, tr?: (key: string, fallback: string) => string): string {
  const today = todayStr();
  const yesterday = offsetDate(today, -1);
  if (dateStr === today) return tr ? tr('common.today', 'Today') : 'Today';
  if (dateStr === yesterday) return tr ? tr('salat.yesterday', 'Yesterday') : 'Yesterday';
  return formatLocaleDate(new Date(dateStr + 'T12:00:00'), {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// ─── types ───────────────────────────────────────────────────────────────────

interface SubTagDef {
  value: PrayerLocation;
  label: string;
  emoji: string;
  note: string;
}

const LOCATION_TAGS: SubTagDef[] = [
  { value: 'mosque', label: 'At Mosque', emoji: '🕌', note: 'in jamat' },
  { value: 'jamat', label: 'In Jamat', emoji: '👥', note: 'not at mosque' },
  { value: 'home', label: 'At Home', emoji: '🏠', note: 'alone' },
];

// Primary colour per status
const STATUS_STYLE: Record<
  PrayerStatus,
  { bg: string; border: string; text: string; emoji: string }
> = {
  completed: {
    bg: 'bg-brand-emerald/20',
    border: 'border-brand-emerald/60',
    text: 'text-brand-emerald',
    emoji: '✅',
  },
  kaza: {
    bg: 'bg-brand-gold/20',
    border: 'border-brand-gold/60',
    text: 'text-brand-gold',
    emoji: '⏰',
  },
  missed: { bg: 'bg-red-500/20', border: 'border-red-400/60', text: 'text-red-400', emoji: '❌' },
  pending: {
    bg: 'bg-brand-surface',
    border: 'border-brand-border',
    text: 'text-white/40',
    emoji: '⬜',
  },
};

// ─── MissedDayChips ──────────────────────────────────────────────────────────
// Clickable date chips inside the kaza debt panel. Shows recent days that had
// at least one missed prayer (completed < 5). First row is always visible;
// extra rows expand on demand.

const CHIPS_PER_ROW = 5;
const INITIAL_ROWS = 1;
const MAX_EXPANDED_ROWS = 3;

function MissedDayChips({
  calendarDataMap,
  t,
  setSelectedDate,
  setExpandedPrayer,
  setCalendarOpen,
}: {
  calendarDataMap: Map<string, number>;
  t: (key: string, fallback: string, opts?: Record<string, unknown>) => string;
  setSelectedDate: (d: string) => void;
  setExpandedPrayer: (p: PrayerId | null) => void;
  setCalendarOpen: (v: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const today = todayStr();
  const missedDays = Array.from(calendarDataMap.entries())
    .filter(([d, c]) => d < today && c < 5)
    .sort(([a], [b]) => b.localeCompare(a)); // newest first

  if (missedDays.length === 0) return null;

  const visibleCount = expanded
    ? Math.min(missedDays.length, CHIPS_PER_ROW * MAX_EXPANDED_ROWS)
    : CHIPS_PER_ROW * INITIAL_ROWS;
  const visible = missedDays.slice(0, visibleCount);
  const hasMore = missedDays.length > CHIPS_PER_ROW * INITIAL_ROWS;

  return (
    <div className="pt-2.5 mt-1 border-t border-brand-emerald/5 space-y-2">
      <p className="text-white/20 text-[11px] font-semibold uppercase tracking-wide">
        {t('salatTracker.kazaJumpTitle', '⚡ Quick-mark kaza')}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {visible.map(([d]) => (
          <button
            key={d}
            onClick={() => {
              setSelectedDate(d);
              setExpandedPrayer(null);
              setCalendarOpen(false);
            }}
            className="px-2 py-1 rounded-lg bg-brand-deep border border-brand-gold/25 text-brand-gold/70 hover:border-brand-gold/60 hover:text-brand-gold text-[11px] font-semibold transition-all"
          >
            {friendlyDate(d, t)}
          </button>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-white/25 hover:text-white/50 text-[11px] underline underline-offset-2 transition-colors"
        >
          {expanded
            ? t('salatTracker.kazaJumpLess', '▲ Show fewer dates')
            : t('salatTracker.kazaJumpMore', '▾ Show more dates ({{count}})', {
                count: missedDays.length - visibleCount,
              })}
        </button>
      )}
    </div>
  );
}

// ─── component ───────────────────────────────────────────────────────────────

export default function SalatTracker() {
  const { t, i18n } = useTranslation();
  const cycleActive = useCycleActive();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();

  // ?date=YYYY-MM-DD lets the analytics heatmap navigate here directly.
  const dateFromUrl = searchParams.get('date');
  const [selectedDate, setSelectedDate] = useState(() => {
    if (dateFromUrl && /^\d{4}-\d{2}-\d{2}$/.test(dateFromUrl)) return dateFromUrl;
    return todayStr(); // Fajr-boundary tracking day
  });
  const [expandedPrayer, setExpandedPrayer] = useState<PrayerId | null>(null);
  const [showGuestDialog, setShowGuestDialog] = useState(false);

  const isToday = selectedDate === todayStr();

  // Musafir mode — applies to days on/after the journey began while it's on.
  const musafir = useMusafir();
  const travelDay = musafirAppliesOn(musafir, selectedDate);
  const canJoinPrayers = travelDay && !!musafir && jamAllowed(musafir.school);
  // A past civil day whose prayers were never logged reads as "missed" (derived
  // on read — no DB writes, consistent with the app's lazy-expiry approach).
  const isPastDay = selectedDate < todayStr();

  // Start date: the day tracking began (or was reset after deletion).
  // Prevents users from adding entries before this date after a data wipe.
  const salatStartDate = localStorage.getItem('bustandeen_salat_start_date') ?? null;
  const isAtStartDate = salatStartDate ? selectedDate <= salatStartDate : false;

  // Minute tick so the "current prayer" highlight and 🔒 future locks don't
  // go stale when the tab stays open across a prayer-time boundary.
  const [minuteNow, setMinuteNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setMinuteNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Prayer times for current-prayer detection.
  // Use selectedDate's noon (not minuteNow's civil date) to get the right
  // times when the tracking day ≠ civil date (i.e., before Fajr the tracking
  // day is still "yesterday", so we compute yesterday's prayer times).
  const todayPrayerTimes = useMemo(() => {
    const stored = localStorage.getItem('bustandeen_location');
    if (!stored) return null;
    try {
      const loc = JSON.parse(stored) as { latitude: number; longitude: number };
      const prayerDate = new Date(selectedDate + 'T12:00:00');
      const times = calcPrayerTimes(loc.latitude, loc.longitude, prayerDate);
      const info = getCurrentAndNextPrayer(times, minuteNow);
      return {
        times: {
          fajr: times.fajr,
          dhuhr: times.dhuhr,
          asr: times.asr,
          maghrib: times.maghrib,
          isha: times.isha,
        } as Record<string, Date>,
        full: times,
        nextTime: info.nextTime,
        // During the sun-setting forbidden window (last ~17 min before
        // Maghrib), Asr is technically over but Maghrib hasn't begun — don't
        // highlight either as "current".
        current: info.inForbiddenGap ? undefined : (info.current as string),
      };
    } catch {
      return null;
    }
  }, [selectedDate, minuteNow]);

  // Month calendar state — full-month view for navigating to any past day
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(() => selectedDate.substring(0, 7));

  // A prayer's window has auto-closed (adhan-time-derived) for today while
  // still logged pending — flag it so nobody forgets to mark it, without
  // waiting until the day rolls over into "missed".
  const isOverdueToday = (prayerId: PrayerId): boolean => {
    if (!isToday || !todayPrayerTimes?.full) return false;
    const end = getPrayerEndTime(prayerId, todayPrayerTimes.full);
    return minuteNow > end;
  };

  const { data: log, isLoading } = useSalatLog(selectedDate);
  const updatePrayer = useUpdatePrayer();
  const updateNafl = useUpdateNafl();

  // Weekly summary strip + calendar data (90-day window always fetched).
  // Pass the Fajr-boundary tracking day so the 7-day strip matches the tracker.
  const { data: weekAnalytics } = useSalatAnalytics(7, todayStr());
  const weekDays = weekAnalytics?.last7Days ?? [];
  // Build a lookup from calendarData for the month calendar (90 days).
  const calendarDataMap = useMemo(() => {
    const m = new Map<string, number>();
    (weekAnalytics?.calendarData ?? []).forEach((d) => m.set(d.date, d.completed));
    return m;
  }, [weekAnalytics]);

  // Tarawih during Ramadan lives on the FastingLog row (category 'ramadan'),
  // the same record /ramadan writes — one source of truth, two places to tap.
  const ramadanActive = isRamadanNow();
  const { data: ramadanHistory } = useFastingHistory(3, ramadanActive);
  const upsertFasting = useUpsertFastingLog();
  const ramadanTodayLog = useMemo(
    () => (ramadanHistory ?? []).find((l) => l.date === todayStr() && l.category === 'ramadan'),
    [ramadanHistory]
  );
  const toggleTarawih = () => {
    if (!user) {
      setShowGuestDialog(true);
      return;
    }
    upsertFasting.mutate({
      date: todayStr(),
      category: 'ramadan',
      status: (ramadanTodayLog?.status as 'completed' | 'intended' | 'broken') ?? 'intended',
      tarawih: !ramadanTodayLog?.tarawih,
    });
  };

  // Friday specials — both derive from the same minute tick that drives the
  // prayer clock, so no extra timer and no notification permission.
  const isCivilFriday = new Date(selectedDate + 'T12:00:00').getDay() === 5;
  const isFridayToday = isCivilFriday && selectedDate === todayStr();
  const fridayHour = useMemo(
    () => getFridayHour(todayPrayerTimes?.times.asr, todayPrayerTimes?.times.maghrib, minuteNow),
    [todayPrayerTimes, minuteNow]
  );

  // Salat → Zikr wiring (see creditDhikr) + the settings drawer
  const addCounts = useZikrStore((s) => s.addCounts);
  const flushZikr = useZikrStore((s) => s.flush);
  const hydrateZikr = useZikrStore((s) => s.hydrate);
  const queryClient = useQueryClient();
  const [showSettings, setShowSettings] = useState(false);

  // Nafl state
  const [naflExpanded, setNaflExpanded] = useState(false);
  const [naflInfoExpanded, setNaflInfoExpanded] = useState<NaflType | null>(null);
  const [rakatOverrides, setRakatOverrides] = useState<Record<string, number>>({});

  // Kaza debt — fully automatic: a day that passes with a prayer still
  // pending is folded into these counters server-side (see ensureCaughtUp in
  // salatDebt.service.ts), no manual ❌ Miss tap required. One plain number
  // field per prayer stays as the correction path — for debt owed from
  // before tracking started, or to hand-correct after a reset — instead of
  // separate +/- steppers, so there's exactly one way to change a count.
  // "Reset" gives a demotivated user a clean slate without losing history.
  const { data: debt } = useSalatDebt();
  const setDebtExact = useSetSalatDebt();
  const [debtExpanded, setDebtExpanded] = useState(false);
  const [legendExpanded, setLegendExpanded] = useState(false);
  const [debtDrafts, setDebtDrafts] = useState<Partial<Record<PrayerId, string>>>({});

  const commitDebtEdit = (prayer: PrayerId, rawValue: string) => {
    setDebtDrafts((d) => {
      const next = { ...d };
      delete next[prayer];
      return next;
    });
    const current = debt?.owed[prayer] ?? 0;
    const count = Math.max(0, Math.min(9999, parseInt(rawValue, 10) || 0));
    if (count === current) return; // no real change — don't spam a request
    if (!user) {
      setShowGuestDialog(true);
      return;
    }
    setDebtExact.mutate({ prayer, count, date: todayStr() });
  };

  const naflEntry = log?.nafl ?? { completed: false, types: [], rakat: 2 };

  const getTypeRakat = (type: NaflType): number => {
    if (type in rakatOverrides) return rakatOverrides[type];
    const meta = NAFL_TYPE_META.find((m) => m.id === type);
    return meta?.defaultRakat ?? MIN_RAKAT;
  };

  const naflTotalRakat = (naflEntry.types ?? []).reduce((s, nt) => s + getTypeRakat(nt), 0);

  const handleNaflToggle = () => {
    if (!user) {
      setShowGuestDialog(true);
      return;
    }
    const newCompleted = !naflEntry.completed;
    const keptTypes = newCompleted ? (naflEntry.types ?? []) : [];
    if (!newCompleted) setRakatOverrides({});
    updateNafl.mutate({
      completed: newCompleted,
      types: keptTypes,
      rakat: newCompleted
        ? keptTypes.length > 0
          ? keptTypes.reduce((s, nt) => s + getTypeRakat(nt), 0)
          : MIN_RAKAT
        : MIN_RAKAT,
      date: selectedDate,
    });
    if (newCompleted) setNaflExpanded(true);
    else setNaflExpanded(false);
  };

  const handleNaflTypeToggle = (type: NaflType) => {
    if (!user) {
      setShowGuestDialog(true);
      return;
    }
    const currentTypes = naflEntry.types ?? [];
    const adding = !currentTypes.includes(type);
    const next = adding ? [...currentTypes, type] : currentTypes.filter((nt) => nt !== type);
    if (!adding) {
      setRakatOverrides((prev) => {
        const n = { ...prev };
        delete n[type];
        return n;
      });
    }
    const newTotal = next.reduce((s, nt) => s + getTypeRakat(nt), 0);
    updateNafl.mutate({
      completed: naflEntry.completed,
      types: next,
      rakat: Math.max(MIN_RAKAT, newTotal),
      date: selectedDate,
    });
  };

  const handleTypeRakat = (type: NaflType, delta: number) => {
    if (!user) {
      setShowGuestDialog(true);
      return;
    }
    const current = getTypeRakat(type);
    const next = Math.max(MIN_RAKAT, current + delta * 2);
    setRakatOverrides((prev) => ({ ...prev, [type]: next }));
    const types = naflEntry.types ?? [];
    const newTotal = types.reduce((s, nt) => s + (nt === type ? next : getTypeRakat(nt)), 0);
    updateNafl.mutate({
      completed: naflEntry.completed,
      types,
      rakat: newTotal,
      date: selectedDate,
    });
  };

  // Location-tag copy is defined outside the component (module scope), so it
  // can't call the i18n hook directly — this maps each tag's value to its
  // translated label/note at render time.
  const locationTagText = (value: PrayerLocation): { label: string; note: string } => {
    switch (value) {
      case 'mosque':
        return {
          label: t('salatTracker.locMosque', 'At Mosque'),
          note: t('salatTracker.locMosqueNote', 'in jamat'),
        };
      case 'jamat':
        return {
          label: t('salatTracker.locJamat', 'In Jamat'),
          note: t('salatTracker.locJamatNote', 'not at mosque'),
        };
      default:
        return {
          label: t('salatTracker.locHome', 'At Home'),
          note: t('salatTracker.locHomeNote', 'alone'),
        };
    }
  };

  const trackablePrayers = PRAYER_META.filter((p) => p.isTrackable);

  const completedCount = useMemo(() => {
    if (!log) return 0;
    return trackablePrayers.filter((p) => {
      const s = log.prayers[p.id as PrayerId]?.status;
      return s === 'completed' || s === 'kaza';
    }).length;
  }, [log, trackablePrayers]);

  // Normalise legacy DB values ('prayed'/'mosque' from the old schema) so we
  // never send them back to the API, which now rejects them.
  const normaliseStatus = (raw: string | undefined): PrayerStatus => {
    if (raw === 'prayed' || raw === 'mosque') return 'completed';
    return raw && raw in STATUS_STYLE ? (raw as PrayerStatus) : 'pending';
  };

  // Handle primary status tap
  const handleStatus = (prayer: PrayerId, status: PrayerStatus) => {
    if (!user) {
      setShowGuestDialog(true);
      return;
    }
    // HARD BLOCK (Istiak's spec): a prayer whose time hasn't arrived today
    // cannot be logged in any state — the row is visually locked, and this
    // guard closes every other code path.
    if (
      selectedDate === todayStr() &&
      isFuturePrayer(prayer, todayPrayerTimes?.times) &&
      !log?.prayers[prayer]?.jam
    ) {
      toast.error(t('salatTracker.tooEarly', "This prayer's time hasn't arrived yet."), {
        id: 'salat-early',
        icon: '🔒',
      });
      return;
    }
    const current = log?.prayers[prayer];
    // If tapping the already-active status, clear it (toggle off)
    const newStatus: PrayerStatus =
      normaliseStatus(current?.status) === status ? 'pending' : status;

    // Moving AWAY from completed/kaza: deduct any tasbih/ayatulKursi zikr that
    // was auto-credited. The server clears these flags on non-completed statuses,
    // but the zikr store needs the matching subtraction.
    const wasCompleted =
      normaliseStatus(current?.status) === 'completed' ||
      normaliseStatus(current?.status) === 'kaza';
    const willBeCompleted = newStatus === 'completed' || newStatus === 'kaza';
    if (wasCompleted && !willBeCompleted) {
      if (current?.tasbeeh) creditDhikr('tasbeeh', false, current, prayer);
      if (current?.ayatulKursi) creditDhikr('ayatulKursi', false, current, prayer);
    }

    // Un-marking one half of a joined (jamʿ) pair: the other half is no longer joined.
    const partner = jamPartner(prayer);
    const partnerEntry = partner ? log?.prayers[partner] : undefined;
    if (wasCompleted && !willBeCompleted && current?.jam && partner && partnerEntry?.jam) {
      updatePrayer.mutate({
        prayer: partner,
        status: normaliseStatus(partnerEntry.status) === 'kaza' ? 'kaza' : 'completed',
        date: selectedDate,
        location: partnerEntry.location ?? 'home',
        tasbeeh: partnerEntry.tasbeeh ?? false,
        ayatulKursi: partnerEntry.ayatulKursi ?? false,
        windowStart: partnerEntry.windowStart,
        windowEnd: partnerEntry.windowEnd,
        jam: null,
      });
    }

    // If setting to completed/kaza, open sub-tag row; keep existing location if re-selecting
    if (newStatus === 'completed' || newStatus === 'kaza') {
      // Window bounds for the "prayed early/mid/late" analytic — computed
      // here (not read back later) since only the client has the adhan
      // library + saved location. Omitted when there's no location set.
      const windowStartDate = todayPrayerTimes?.times[prayer];
      const windowEndDate = todayPrayerTimes?.full
        ? getPrayerEndTime(prayer, todayPrayerTimes.full)
        : undefined;
      updatePrayer.mutate({
        prayer,
        status: newStatus,
        date: selectedDate,
        location: current?.location ?? 'home',
        tasbeeh: current?.tasbeeh ?? false,
        // Was previously omitted — re-tapping an already-completed prayer wiped
        // an existing Ayatul Kursi mark (and, now, its linked zikr count).
        ayatulKursi: current?.ayatulKursi ?? false,
        windowStart: windowStartDate ? windowStartDate.toISOString() : undefined,
        windowEnd: windowEndDate ? windowEndDate.toISOString() : undefined,
        // On a travel day the four-rak'ah prayers are logged as qaṣr — unless
        // this one was already marked as prayed in full (local imam / Jumu'ah).
        qasr: travelDay && isQasrPrayer(prayer) ? current?.qasr !== false : undefined,
      });
      // Celebrate: small burst per prayer, big double burst when all 5 are in
      const doneAfter = trackablePrayers.filter((p) => {
        const s = p.id === prayer ? newStatus : log?.prayers[p.id as PrayerId]?.status;
        return s === 'completed' || s === 'kaza';
      }).length;
      if (doneAfter >= 5) celebrateAllPrayers();
      else celebrateSmall();
      setExpandedPrayer(prayer); // open sub-tags
    } else if (newStatus === 'missed') {
      updatePrayer.mutate({
        prayer,
        status: newStatus,
        date: selectedDate,
        missedReason: current?.missedReason,
      });
      setExpandedPrayer(prayer); // open the optional reason picker
    } else {
      updatePrayer.mutate({
        prayer,
        status: newStatus,
        date: selectedDate,
      });
      setExpandedPrayer(null);
    }
  };

  // Handle the optional "why was it missed" tag — purely for the user's own
  // pattern analysis, never required to mark a prayer missed.
  const handleMissedReason = (prayer: PrayerId, reason: MissedReason) => {
    if (!user) {
      setShowGuestDialog(true);
      return;
    }
    const current = log?.prayers[prayer];
    // Tapping the already-selected reason clears it (toggle off).
    const next = current?.missedReason === reason ? undefined : reason;
    updatePrayer.mutate({
      prayer,
      status: 'missed',
      date: selectedDate,
      missedReason: next,
    });
  };

  // Musafir: switch one logged prayer between qaṣr (2) and full (4 behind a
  // local imam, or Jumu'ah on a Friday).
  const setQasr = (prayer: PrayerId, qasr: boolean) => {
    if (!user) {
      setShowGuestDialog(true);
      return;
    }
    const current = log?.prayers[prayer];
    const normalised = normaliseStatus(current?.status);
    updatePrayer.mutate({
      prayer,
      status: normalised === 'pending' ? 'completed' : normalised,
      date: selectedDate,
      location: current?.location ?? 'home',
      tasbeeh: current?.tasbeeh ?? false,
      ayatulKursi: current?.ayatulKursi ?? false,
      windowStart: current?.windowStart,
      windowEnd: current?.windowEnd,
      qasr,
    });
  };

  // Musafir jamʿ: log both prayers of a pair (Ẓuhr+ʿAṣr, Maghrib+ʿIshāʾ) in one
  // tap, in the earlier prayer's time (taqdīm) or the later one's (taʾkhīr).
  // Mu'ādh at Tabūk: "if he set out after the sun declined, he brought ʿAṣr
  // forward to Ẓuhr and prayed them together" (Tirmidhī 553, Abū Dāwūd 1220).
  // Taqdīm bypasses the "not yet" lock on purpose — that is what joining is.
  const joinPair = (first: PrayerId, kind: 'taqdim' | 'takhir') => {
    if (!user) {
      setShowGuestDialog(true);
      return;
    }
    const second = jamPartner(first);
    if (!second) return;
    // Only the prayer whose own time it is gets a window (early/mid/late analytics).
    const windowOf = (p: PrayerId) => {
      const start = isToday ? todayPrayerTimes?.times[p] : undefined;
      const end =
        isToday && todayPrayerTimes?.full ? getPrayerEndTime(p, todayPrayerTimes.full) : undefined;
      return {
        windowStart: start ? start.toISOString() : undefined,
        windowEnd: end ? end.toISOString() : undefined,
      };
    };
    const inTimeOf = kind === 'taqdim' ? first : second;
    const firstEntry = log?.prayers[first];
    const location = firstEntry?.location ?? log?.prayers[second]?.location ?? 'home';
    for (const p of [first, second]) {
      const e = log?.prayers[p];
      const done = ['completed', 'kaza'].includes(normaliseStatus(e?.status));
      updatePrayer.mutate({
        prayer: p,
        status: normaliseStatus(e?.status) === 'kaza' ? 'kaza' : 'completed',
        date: selectedDate,
        location: e?.location ?? location,
        tasbeeh: e?.tasbeeh ?? false,
        ayatulKursi: e?.ayatulKursi ?? false,
        ...(done
          ? { windowStart: e?.windowStart, windowEnd: e?.windowEnd }
          : p === inTimeOf
            ? windowOf(p)
            : {}),
        qasr: isQasrPrayer(p) ? e?.qasr !== false : undefined,
        jam: kind,
      });
    }
    const doneAfter = trackablePrayers.filter((p) => {
      const s =
        p.id === second || p.id === first ? 'completed' : log?.prayers[p.id as PrayerId]?.status;
      return s === 'completed' || s === 'kaza';
    }).length;
    if (doneAfter >= 5) celebrateAllPrayers();
    else celebrateSmall();
    toast.success(
      t('salatTracker.jamDone', '{{a}} + {{b}} joined, may Allah accept it', {
        a: translateSalatName(first, first, t),
        b: translateSalatName(second, second, t),
      }),
      { icon: '🔗', duration: 3000 }
    );
  };

  // Musafir jamʿ taʾkhīr (or undo any jamʿ): flag both prayers of the pair.
  const toggleJoined = (second: PrayerId) => {
    if (!user) {
      setShowGuestDialog(true);
      return;
    }
    const first = jamPartner(second);
    if (!first) return;
    const joined = !!log?.prayers[second]?.jam;
    for (const p of [first, second]) {
      const e = log?.prayers[p];
      updatePrayer.mutate({
        prayer: p,
        status: normaliseStatus(e?.status) === 'kaza' ? 'kaza' : 'completed',
        date: selectedDate,
        location: e?.location ?? 'home',
        tasbeeh: e?.tasbeeh ?? false,
        ayatulKursi: e?.ayatulKursi ?? false,
        windowStart: e?.windowStart,
        windowEnd: e?.windowEnd,
        jam: joined ? null : 'takhir',
      });
    }
  };

  // Handle sub-tag change
  const handleSubTag = (
    prayer: PrayerId,
    type: 'location' | 'tasbeeh' | 'ayatulKursi',
    value: PrayerLocation | boolean
  ) => {
    if (!user) {
      setShowGuestDialog(true);
      return;
    }
    const current = log?.prayers[prayer];
    const normalised = normaliseStatus(current?.status);
    updatePrayer.mutate({
      prayer,
      status: normalised === 'pending' ? 'completed' : normalised,
      date: selectedDate,
      location: type === 'location' ? (value as PrayerLocation) : (current?.location ?? 'home'),
      tasbeeh: type === 'tasbeeh' ? (value as boolean) : (current?.tasbeeh ?? false),
      ayatulKursi: type === 'ayatulKursi' ? (value as boolean) : (current?.ayatulKursi ?? false),
      windowStart: current?.windowStart,
      windowEnd: current?.windowEnd,
    });

    if (type === 'location') {
      if (value === 'mosque') {
        toast.success(
          t(
            'salatTracker.congregationReward',
            'Prayer in congregation is 27 times superior — Bukhari 645'
          ),
          { icon: '🕌', duration: 3500, id: 'masjid-reward' }
        );
      }
      return;
    }
    creditDhikr(type, value as boolean, current, prayer);
  };

  /**
   * Salat → Zikr wiring. Marking tasbīḥ or Ayatul Kursi on a prayer posts the
   * counts straight into the dhikr counter, so nobody has to re-enter 33/33/34
   * by hand five times a day — unless "auto-count dhikr" (Salat settings) is
   * off, in which case the tag is still marked (handleSubTag's updatePrayer
   * call runs regardless of this function) but no count is added; Tasbih
   * mode or the counter page become the manual path for someone who'd rather
   * physically count. Un-tapping reverses exactly what was added — tracked
   * via wasDhikrCredited/setDhikrCredited since the setting can be flipped
   * between marking a tag and un-marking it, so the tag's own boolean can't
   * be trusted to mean "a credit was given".
   *
   * Only fires for TODAY: dhikr counts live in today's bucket, so crediting
   * them from a back-dated prayer would file the counts on the wrong day.
   */
  const creditDhikr = (
    type: 'tasbeeh' | 'ayatulKursi',
    turnedOn: boolean,
    current: { tasbeeh?: boolean; ayatulKursi?: boolean } | undefined,
    prayer: PrayerId
  ) => {
    const was = type === 'tasbeeh' ? (current?.tasbeeh ?? false) : (current?.ayatulKursi ?? false);
    if (was === turnedOn) return; // not an actual change — never double-count

    const today = todayStr();
    if (selectedDate !== today) {
      if (turnedOn) {
        toast(t('salatTracker.dhikrTodayOnly', 'Saved. Dhikr counts are only added for today.'), {
          icon: '🗓️',
          duration: 2600,
        });
      }
      return;
    }

    if (turnedOn && !getAutoCountDhikr()) {
      toast.success(
        type === 'tasbeeh'
          ? t('salatTracker.dhikrMarkedOnly', 'Marked — count it yourself in Tasbih mode')
          : t('salatTracker.ayatulKursiMarkedOnly', 'Ayatul Kursi marked'),
        { icon: '✅', duration: 2200 }
      );
      return;
    }

    if (!turnedOn && !wasDhikrCredited(today, prayer, type)) {
      return; // never credited (auto-count was off when marked) — nothing to undo
    }

    const sign: 1 | -1 = turnedOn ? 1 : -1;
    if (type === 'tasbeeh') {
      const meta = tasbihModeMeta(getTasbihMode());
      addCounts(tasbihDeltas(meta.id, sign));
      toast.success(
        turnedOn
          ? t('salatTracker.dhikrAdded', '{{label}} added to your dhikr', { label: meta.label })
          : t('salatTracker.dhikrRemoved', '{{label}} removed', { label: meta.label }),
        { icon: '📿', duration: 2200 }
      );
    } else {
      addCounts({ [AYATUL_KURSI_ZIKR]: sign });
      toast.success(
        turnedOn
          ? t('salatTracker.ayatulKursiCounted', 'Ayatul Kursi counted')
          : t('salatTracker.ayatulKursiRemoved', 'Ayatul Kursi removed'),
        { icon: '📖', duration: 2000 }
      );
    }
    setDhikrCredited(today, prayer, type, turnedOn);

    // Push to the server NOW rather than waiting out the debounce, then
    // re-hydrate so zustand counts agree with the DB (prevents stale local
    // state after undo), and drop the analytics cache so the analytics page
    // reflects the change.
    void (async () => {
      await flushZikr();
      await hydrateZikr();
      await queryClient.invalidateQueries({ queryKey: ['analytics'] });
    })();
  };

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('salatTracker.seoTitle', 'Salat Tracker — Log Your 5 Daily Prayers')}
        description={t(
          'salatTracker.seoDescription',
          "Track Fajr, Dhuhr, Asr, Maghrib and Isha with on-time/late/kaza logging, Jumu'ah tracking, streaks and automatic missed-prayer (kaza) debt accrual."
        )}
        path="/salat"
      />
      {/* ── Tab navigation ── */}
      <h1 className="sr-only">{t('salatTracker.title', 'Salat Tracker')}</h1>
      <div className="px-4 pt-3 pb-0 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <TabNav
            items={[
              {
                label: `🕌 ${t('salatTracker.tabTracker', 'Tracker')}`,
                to: '/salat',
                active: true,
              },
              {
                label: `📊 ${t('salatTracker.tabAnalytics', 'Analytics')}`,
                to: '/salat/analytics',
              },
            ]}
          />
        </div>
        <Link
          to="/musafir"
          aria-label={t('salatTracker.musafirAria', 'Musafir mode')}
          title={t('salatTracker.musafirAria', 'Musafir mode')}
          className={`shrink-0 px-2.5 py-2 rounded-xl border text-sm leading-5 transition-colors ${
            musafir
              ? 'border-brand-info/60 bg-brand-info/20 text-brand-info'
              : 'border-brand-emerald/20 bg-white/5 text-white/50 hover:border-brand-info/40'
          }`}
        >
          🧳
        </Link>
        <button
          onClick={() => setShowSettings(true)}
          aria-label={t('salatTracker.settingsAria', 'Salat settings')}
          title={t('salatTracker.settingsAria', 'Salat settings')}
          className="shrink-0 p-2 rounded-xl border border-brand-emerald/20 bg-white/5 text-white/50 hover:text-brand-emerald hover:border-brand-emerald/40 transition-colors"
        >
          <Cog6ToothIcon className="w-5 h-5" />
        </button>
      </div>
      <SalatSettings open={showSettings} onClose={() => setShowSettings(false)} />

      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-xl mx-auto space-y-5">
          {travelDay && musafir && (
            <MusafirBanner state={musafir} today={selectedDate} variant="salat" />
          )}
          {/* ── Friday: the hour of response (Abū Dāwūd 1048, ṣaḥīḥ) ──
              Shown only while it is actually running — ʿAṣr has begun and
              Maghrib has not. No notification permission, no cron: the page
              already ticks every minute for the prayer clock. */}
          {fridayHour.active && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl border p-4 ${
                fridayHour.isFinalStretch
                  ? 'border-brand-gold/50 bg-gradient-to-br from-brand-gold/15 to-brand-gold-dim/5'
                  : 'border-brand-gold/25 bg-brand-gold/[0.06]'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">🤲</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h3 className="text-brand-gold font-black text-sm">
                      {fridayHour.isFinalStretch
                        ? t('salatTracker.hourOfResponseNow', 'The hour of response — now')
                        : t('salatTracker.hourOfResponse', 'Friday: the hour of response')}
                    </h3>
                    <span className="text-brand-gold/70 text-xs font-bold tabular-nums">
                      {t('salatTracker.toMaghrib', '{{countdown}} to Maghrib', {
                        countdown: fridayHour.countdown,
                      })}
                    </span>
                  </div>
                  <p className="text-white/60 text-xs mt-1.5 leading-relaxed">
                    {t(
                      'salatTracker.hourOfResponseQuote',
                      '"{{text}}" Keep asking until the sun sets — for yourself, your parents, and the ummah.',
                      {
                        text:
                          i18n.language === 'bn' ? FRIDAY_HOUR_REF.textBn : FRIDAY_HOUR_REF.text,
                      }
                    )}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap mt-2.5">
                    <a
                      href={FRIDAY_HOUR_REF.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-white/35 hover:text-brand-gold underline underline-offset-2"
                    >
                      {translateReference(FRIDAY_HOUR_REF.source, i18n.language)} ·{' '}
                      {translateReference(FRIDAY_HOUR_REF.grade, i18n.language)} ↗
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Date navigator */}
          <div className="flex items-center justify-between gap-3">
            <motion.button
              whileHover={isAtStartDate ? {} : { scale: 1.03 }}
              whileTap={isAtStartDate ? {} : { scale: 0.97 }}
              onClick={() => {
                if (!isAtStartDate) {
                  setSelectedDate((d) => offsetDate(d, -1));
                  setExpandedPrayer(null);
                }
              }}
              disabled={isAtStartDate}
              title={
                isAtStartDate
                  ? t('salatTracker.noLogsBefore', 'No logs before this date')
                  : t('salatTracker.previousDay', 'Previous day')
              }
              className="p-2 rounded-xl bg-brand-surface border border-brand-border text-white/60 hover:text-white hover:border-brand-emerald/40 disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </motion.button>
            <div className="text-center">
              <p className="text-white font-bold text-base">{friendlyDate(selectedDate, t)}</p>
              <p className="text-white/30 text-xs">
                {formatLocaleDate(new Date(selectedDate + 'T12:00:00'), {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
              {(() => {
                const h = getHijriDate(new Date(selectedDate + 'T12:00:00'));
                return h ? (
                  <p className="text-brand-gold/40 text-[10px] mt-0.5">{formatHijriDate(h)}</p>
                ) : null;
              })()}
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setSelectedDate((d) => offsetDate(d, 1));
                setExpandedPrayer(null);
              }}
              disabled={isToday}
              className="p-2 rounded-xl bg-brand-surface border border-brand-border text-white/60 hover:text-white hover:border-brand-emerald/40 disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Weekly summary — quick glance at the last 7 days, tap a day to jump */}
          {weekDays.length > 0 && (
            <div className="flex items-stretch gap-1">
              {weekDays.map((d) => {
                const isSel = d.date === selectedDate;
                const isTod = d.date === todayStr();
                const isFutureDay = d.date > todayStr();
                const hasData = !isFutureDay;
                const dot = hasData ? weekDotColor(d.completed) : 'rgba(255,255,255,0.12)';
                return (
                  <motion.button
                    key={d.date}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      setSelectedDate(d.date);
                      setExpandedPrayer(null);
                      setCalendarOpen(false);
                    }}
                    aria-label={t('salatTracker.selectDay', 'Select {{day}}', {
                      day: friendlyDate(d.date, t),
                    })}
                    className={`flex-1 min-w-0 flex flex-col items-center gap-1 py-2 rounded-xl border transition-all ${
                      isSel
                        ? 'bg-white/10 border-brand-emerald/30'
                        : 'bg-white/[0.03] border-brand-emerald/5 hover:border-brand-emerald/20'
                    }`}
                  >
                    <span
                      className={`text-[9px] uppercase font-bold ${isTod ? 'text-brand-emerald' : 'text-white/30'}`}
                    >
                      {formatLocaleDate(new Date(d.date + 'T12:00:00'), { weekday: 'narrow' })}
                    </span>
                    <span className={`text-xs font-bold ${isSel ? 'text-white' : 'text-white/50'}`}>
                      {formatLocaleNumber(parseInt(d.date.slice(8), 10))}
                    </span>
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: dot, boxShadow: hasData ? `0 0 6px ${dot}` : 'none' }}
                    />
                  </motion.button>
                );
              })}
              {/* Calendar toggle button — opens the full-month view */}
              <button
                onClick={() => {
                  setCalMonth(selectedDate.substring(0, 7));
                  setCalendarOpen((o) => !o);
                }}
                aria-label={t('salatTracker.openCalendar', 'Open month calendar')}
                title={t('salatTracker.openCalendar', 'Open month calendar')}
                className={`shrink-0 flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-xl border transition-all ${
                  calendarOpen
                    ? 'bg-brand-emerald/20 border-brand-emerald/40 text-brand-emerald'
                    : 'bg-white/[0.03] border-brand-emerald/5 text-white/40 hover:border-brand-emerald/20 hover:text-white/70'
                }`}
              >
                <CalendarDaysIcon className="w-4 h-4" />
                <span className="text-[9px] font-bold uppercase">
                  {formatLocaleDate(new Date(selectedDate.substring(0, 7) + '-15T12:00:00'), {
                    month: 'narrow',
                  })}
                </span>
              </button>
            </div>
          )}

          {/* Month calendar — full month view, tap any day to navigate there */}
          <AnimatePresence>
            {calendarOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                <div className="rounded-2xl border border-brand-emerald/10 bg-white/[0.04] p-3">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={() => {
                        const [y, m] = calMonth.split('-').map(Number);
                        const d = new Date(y!, m! - 2, 1);
                        setCalMonth(
                          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                        );
                      }}
                      className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10"
                    >
                      <ChevronLeftIcon className="w-4 h-4" />
                    </button>
                    <p className="text-white font-bold text-sm">
                      {formatLocaleDate(new Date(calMonth + '-15T12:00:00'), {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                    <button
                      onClick={() => {
                        const [y, m] = calMonth.split('-').map(Number);
                        const d = new Date(y!, m!, 1);
                        setCalMonth(
                          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                        );
                      }}
                      disabled={calMonth >= todayStr().substring(0, 7)}
                      className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-20"
                    >
                      <ChevronRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                      <span key={i} className="text-white/25 text-[9px] font-bold uppercase">
                        {d}
                      </span>
                    ))}
                    {(() => {
                      const [y, m] = calMonth.split('-').map(Number);
                      const first = new Date(y!, m! - 1, 1);
                      const daysInMonth = new Date(y!, m!, 0).getDate();
                      const blanks = first.getDay();
                      const cells = [];
                      for (let i = 0; i < blanks; i++) cells.push(<span key={`b${i}`} />);
                      for (let d = 1; d <= daysInMonth; d++) {
                        const dateStr = `${calMonth}-${String(d).padStart(2, '0')}`;
                        const completed = calendarDataMap.get(dateStr);
                        const isFuture = dateStr > todayStr();
                        const isSel = dateStr === selectedDate;
                        const isTod = dateStr === todayStr();
                        const salatStart = localStorage.getItem('bustandeen_salat_start_date');
                        const isBeforeStart = salatStart ? dateStr < salatStart : false;
                        const dot =
                          completed === 5
                            ? '#7a9e6e'
                            : completed != null && completed >= 3
                              ? '#c9a96e'
                              : completed != null && completed >= 1
                                ? '#f59e0b'
                                : completed === 0
                                  ? '#ef4444'
                                  : undefined;
                        cells.push(
                          <button
                            key={dateStr}
                            disabled={isFuture || isBeforeStart}
                            onClick={() => {
                              setSelectedDate(dateStr);
                              setExpandedPrayer(null);
                              setCalendarOpen(false);
                            }}
                            className={`relative aspect-square rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                              isFuture || isBeforeStart
                                ? 'opacity-20 cursor-not-allowed'
                                : 'hover:bg-white/10 cursor-pointer'
                            } ${isSel ? 'bg-brand-emerald/25 border border-brand-emerald/50' : ''} ${isTod && !isSel ? 'border border-brand-emerald/30' : ''}`}
                          >
                            <span className={isTod ? 'text-brand-emerald' : 'text-white/70'}>
                              {formatLocaleNumber(d)}
                            </span>
                            {dot && !isFuture && !isBeforeStart && (
                              <span className="w-1 h-1 rounded-full" style={{ background: dot }} />
                            )}
                          </button>
                        );
                      }
                      return cells;
                    })()}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Rayhanah days — salat fully excused (never made up) */}
          {cycleActive && selectedDate >= cycleActive.startDate ? (
            <ExcusedCard feature="salat" />
          ) : (
            <>
              {/* Progress bar */}
              <div className="card bg-gradient-to-br from-brand-emerald/10 to-brand-deep border border-brand-emerald/20 rounded-2xl">
                <div className="card-body p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/60 text-xs font-semibold uppercase tracking-wide">
                      {t('salatTracker.datePrayers', "{{date}}'s Prayers", {
                        date: friendlyDate(selectedDate, t),
                      })}
                    </span>
                    <span className="text-xl font-black text-brand-emerald">
                      {formatLocaleNumber(completedCount)}
                      <span className="text-white/30 font-normal text-base">
                        /{formatLocaleNumber(5)}
                      </span>
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-brand-emerald to-brand-info rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(completedCount / 5) * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  {completedCount === 5 && (
                    <p className="text-brand-emerald text-xs mt-1 font-semibold">
                      {t('salatTracker.allCompleted', '🎉 All prayers completed — MashaAllah!')}
                    </p>
                  )}
                </div>
              </div>

              {/* Prayer cards */}
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <span className="loading loading-spinner loading-lg text-brand-emerald" />
                </div>
              ) : (
                <div className="space-y-2">
                  {trackablePrayers.map((prayer, i) => {
                    const prayerId = prayer.id as PrayerId;
                    const entry = log?.prayers[prayerId];
                    // Normalise legacy DB values (old model used 'prayed'/'mosque') to new schema
                    const rawStatus = (entry?.status ?? 'pending') as string;
                    const status: PrayerStatus =
                      rawStatus === 'prayed' || rawStatus === 'mosque'
                        ? 'completed'
                        : rawStatus in STATUS_STYLE
                          ? (rawStatus as PrayerStatus)
                          : 'pending';
                    // Past unlogged fard shows as missed (still editable — just tap a status).
                    const displayStatus: PrayerStatus =
                      isPastDay && status === 'pending' ? 'missed' : status;
                    const style = STATUS_STYLE[displayStatus] ?? STATUS_STYLE['pending'];
                    const isCurrent =
                      isToday && isCurrentPrayer(prayerId, todayPrayerTimes?.current);
                    const isFuture = isToday && isFuturePrayer(prayerId, todayPrayerTimes?.times);
                    // Musafir: is this row a shortened (qaṣr) prayer? A logged
                    // flag wins; otherwise a travel day implies it for Ẓuhr/ʿAṣr/ʿIshāʾ.
                    const isQasrRow =
                      entry?.qasr === true ||
                      (travelDay && isQasrPrayer(prayerId) && entry?.qasr !== false);
                    // Friday's Dhuhr is Jumu'ah — unless a traveller prays Ẓuhr instead.
                    const isJumuah = prayerId === 'dhuhr' && isCivilFriday && !isQasrRow;
                    // Joined early (jamʿ taqdīm): logged before its own time came.
                    const joinedEarly = isFuture && !!entry?.jam;
                    const jamWith = jamPartner(prayerId);
                    // Window auto-closed today (adhan-derived) but never logged —
                    // nudge without forcing it into 'missed' the way a past day does.
                    const isOverdue = status === 'pending' && isOverdueToday(prayerId);
                    const isExpanded = expandedPrayer === prayerId;
                    const hasSubTag = status === 'completed' || status === 'kaza';

                    // Current prayer time (if available)
                    const prayerStartTime =
                      todayPrayerTimes?.times[prayerId] instanceof Date
                        ? formatTime(todayPrayerTimes.times[prayerId])
                        : null;
                    // End times — only shown for today
                    const prayerEndTime =
                      todayPrayerTimes?.full && isToday
                        ? formatTime(getPrayerEndTime(prayerId, todayPrayerTimes.full))
                        : null;
                    // Isha has a secondary "final window" end (tomorrow's Fajr)
                    const ishaFinalEndTime =
                      prayerId === 'isha' && todayPrayerTimes?.full && isToday
                        ? formatTime(new Date(todayPrayerTimes.full.fajr.getTime() + 86_400_000))
                        : null;

                    return (
                      <motion.div
                        key={prayer.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.01, y: -2 }}
                        transition={{ delay: 0.04 * i }}
                        layout
                        className={`rounded-2xl border overflow-hidden transition-colors ${
                          isCurrent
                            ? 'bg-brand-emerald/10 border-brand-emerald/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                            : isOverdue
                              ? 'bg-brand-gold/10 border-brand-gold/40'
                              : `${style.bg} ${style.border}`
                        }`}
                      >
                        {/* Main row */}
                        <div className="p-3 flex items-center gap-3">
                          {/* Prayer info */}
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="text-2xl shrink-0">{prayer.icon}</span>
                            <div className="min-w-0">
                              <p
                                className={`font-bold text-sm leading-none ${isCurrent ? 'text-brand-emerald' : isOverdue ? 'text-brand-gold' : style.text}`}
                              >
                                {isJumuah
                                  ? t('salatNames.jumuah', "Jumu'ah")
                                  : translateSalatName(prayer.id, prayer.name, t)}
                                {isCurrent && (
                                  <span className="ml-2 text-xs font-normal text-brand-emerald/70">
                                    ● {t('salatTracker.nowTag', 'now')}
                                  </span>
                                )}
                                {isOverdue && (
                                  <span className="ml-2 text-xs font-normal text-brand-gold/80">
                                    ⚠️{' '}
                                    {prayerId === 'isha'
                                      ? t('salatTracker.ishaLateTag', 'better before midnight')
                                      : t('salatTracker.overdueTag', 'window closed')}
                                  </span>
                                )}
                                {isJumuah && (
                                  <span className="ml-2 text-xs font-normal text-brand-emerald/60">
                                    🕌 congregation
                                  </span>
                                )}
                                {(isQasrRow || (travelDay && !isQasrPrayer(prayerId))) && (
                                  <span
                                    className={`mt-1 block w-fit whitespace-nowrap text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                      isQasrRow
                                        ? 'bg-brand-info/20 text-brand-info'
                                        : 'bg-white/10 text-white/40'
                                    }`}
                                  >
                                    {isQasrRow
                                      ? t('salatTracker.qasrBadge', '✂️ {{n}} · qaṣr', {
                                          n: formatLocaleNumber(travelRakat(prayerId)),
                                        })
                                      : t('salatTracker.rakatBadge', '{{n}} rakʿah', {
                                          n: formatLocaleNumber(FARD_RAKAT[prayerId]),
                                        })}
                                  </span>
                                )}
                                {entry?.jam && hasSubTag && (
                                  <span className="mt-1 block w-fit whitespace-nowrap text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-brand-gold/20 text-brand-gold">
                                    {t('salatTracker.jamBadge', '🔗 joined')}
                                  </span>
                                )}
                              </p>
                              {prayerStartTime && isToday && (
                                <div className="mt-0.5 space-y-px">
                                  <p className="text-white/30 text-xs leading-none">
                                    {prayerStartTime}
                                    {prayerEndTime && (
                                      <>
                                        <span className="text-white/15"> → </span>
                                        <span className="text-white/25">{prayerEndTime}</span>
                                        {ishaFinalEndTime && (
                                          <span className="text-white/15 text-[10px]">
                                            {' '}
                                            ({t('salatTracker.best', 'best')})
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </p>
                                  {ishaFinalEndTime && (
                                    <p className="text-white/20 text-[10px] leading-none">
                                      {t('salatTracker.ishaFinalWindow', 'window → {{time}}', {
                                        time: ishaFinalEndTime,
                                      })}
                                    </p>
                                  )}
                                </div>
                              )}
                              {isJumuah && (
                                <p className="text-brand-emerald/50 text-xs mt-0.5">
                                  replaces Dhuhr — attend at mosque
                                </p>
                              )}
                              {prayerId === 'dhuhr' && isCivilFriday && travelDay && !isJumuah && (
                                <p className="text-brand-info/60 text-xs mt-0.5">
                                  {t(
                                    'salatTracker.travelFriday',
                                    "Travelling: Ẓuhr instead of Jumu'ah (Muslim 1218a)"
                                  )}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Primary action buttons (future prayers locked for today) */}
                          {isFuture && !joinedEarly ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-white/20 text-xs font-medium px-2 py-1 rounded-lg border border-brand-emerald/10">
                                {t('salatTracker.notYet', '🔒 not yet')}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              {/* Completed */}
                              <motion.button
                                whileTap={{ scale: 0.88 }}
                                onClick={() => handleStatus(prayerId, 'completed')}
                                className={`px-1.5 py-1 sm:px-2.5 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold border transition-all ${
                                  status === 'completed'
                                    ? 'bg-brand-emerald text-white border-brand-emerald shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                                    : 'bg-brand-deep border-brand-border text-white/50 hover:border-brand-emerald/50 hover:text-white/80'
                                }`}
                              >
                                {t('salatTracker.done', '✅ Done')}
                              </motion.button>
                              {/* Kaza */}
                              <motion.button
                                whileTap={{ scale: 0.88 }}
                                onClick={() => handleStatus(prayerId, 'kaza')}
                                className={`px-1.5 py-1 sm:px-2.5 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold border transition-all ${
                                  status === 'kaza'
                                    ? 'bg-brand-gold text-white border-brand-gold shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                                    : 'bg-brand-deep border-brand-border text-white/50 hover:border-brand-gold/50 hover:text-white/80'
                                }`}
                              >
                                {t('salatTracker.kaza', '⏰ Kaza')}
                              </motion.button>
                              {/* Missed */}
                              <motion.button
                                whileTap={{ scale: 0.88 }}
                                onClick={() => handleStatus(prayerId, 'missed')}
                                className={`px-1.5 py-1 sm:px-2.5 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold border transition-all ${
                                  status === 'missed'
                                    ? 'bg-red-500 text-white border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                                    : 'bg-brand-deep border-brand-border text-white/50 hover:border-red-400/50 hover:text-white/80'
                                }`}
                              >
                                {t('salatTracker.miss', '❌ Miss')}
                              </motion.button>
                            </div>
                          )}
                        </div>

                        {/* Sub-tags row (only for completed/kaza) */}
                        <AnimatePresence>
                          {hasSubTag && isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.18 }}
                              className="overflow-hidden border-t border-brand-emerald/10"
                            >
                              <div className="px-3 py-2.5 space-y-2">
                                {/* Location tags — only for completed (kaza is always prayed alone).
                                Friday's Dhuhr (Jumu'ah) is skipped entirely: it's only valid as a
                                mosque congregation prayer, so the location is set automatically
                                instead of asking the user to pick it. */}
                                {status === 'completed' && isJumuah && (
                                  <p className="text-brand-emerald/60 text-[11px] sm:text-xs">
                                    {t(
                                      'salatTracker.jumuahAutoMosque',
                                      "🕌 Marked at the mosque automatically — Jumu'ah is only valid in congregation."
                                    )}
                                  </p>
                                )}
                                {status === 'completed' && !isJumuah && (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-white/30 text-[11px] sm:text-xs">
                                      {t('salatTracker.whereLabel', 'Where:')}
                                    </span>
                                    {LOCATION_TAGS.map((tag) => {
                                      const { label, note } = locationTagText(tag.value);
                                      return (
                                        <motion.button
                                          key={tag.value}
                                          whileTap={{ scale: 0.9 }}
                                          onClick={() =>
                                            handleSubTag(prayerId, 'location', tag.value)
                                          }
                                          className={`flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold border transition-all ${
                                            entry?.location === tag.value ||
                                            (!entry?.location && tag.value === 'home')
                                              ? 'bg-brand-emerald/20 border-brand-emerald/60 text-brand-emerald'
                                              : 'bg-brand-deep border-brand-border text-white/40 hover:text-white/70'
                                          }`}
                                        >
                                          <span>{tag.emoji}</span> {label}
                                          <span className="text-white/25 text-xs hidden sm:inline">
                                            ({note})
                                          </span>
                                        </motion.button>
                                      );
                                    })}
                                  </div>
                                )}
                                {status === 'kaza' && isJumuah && (
                                  <p className="text-brand-gold/60 text-[11px] sm:text-xs">
                                    {t(
                                      'salatTracker.jumuahKazaAlone',
                                      "⏰ Made up as an ordinary Dhuhr, prayed alone — Jumu'ah itself has no kaza."
                                    )}
                                  </p>
                                )}
                                {/* Musafir: 2 (qaṣr) or in full — behind a local
                                imam, or Jumu'ah on a Friday. */}
                                {(travelDay || entry?.qasr !== undefined) &&
                                  isQasrPrayer(prayerId) && (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-white/30 text-[11px] sm:text-xs">
                                        🧳 {t('salatTracker.prayedAs', 'Prayed as:')}
                                      </span>
                                      {[true, false].map((q) => {
                                        const on = q ? isQasrRow : !isQasrRow;
                                        const label = q
                                          ? t('salatTracker.asQasr', '✂️ 2 · qaṣr')
                                          : prayerId === 'dhuhr' && isCivilFriday
                                            ? t('salatTracker.asJumuah', "🕌 Jumu'ah")
                                            : t('salatTracker.asFull', '4 · behind a local imam');
                                        return (
                                          <motion.button
                                            key={String(q)}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => !on && setQasr(prayerId, q)}
                                            aria-pressed={on}
                                            className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold border transition-all ${
                                              on
                                                ? 'bg-brand-info/20 border-brand-info/60 text-brand-info'
                                                : 'bg-brand-deep border-brand-border text-white/40 hover:text-white/70'
                                            }`}
                                          >
                                            {label}
                                          </motion.button>
                                        );
                                      })}
                                    </div>
                                  )}
                                {/* Musafir jamʿ taʾkhīr — flag the pair as joined */}
                                {canJoinPrayers &&
                                  (prayerId === 'asr' || prayerId === 'isha') &&
                                  jamWith &&
                                  ['completed', 'kaza'].includes(
                                    normaliseStatus(log?.prayers[jamWith]?.status)
                                  ) && (
                                    <motion.button
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => toggleJoined(prayerId)}
                                      aria-pressed={!!entry?.jam}
                                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all ${
                                        entry?.jam
                                          ? 'bg-brand-gold/20 border-brand-gold/60 text-brand-gold'
                                          : 'bg-brand-deep border-brand-border text-white/40 hover:text-white/70'
                                      }`}
                                    >
                                      🔗{' '}
                                      {t('salatTracker.joinedWith', 'Joined with {{name}}', {
                                        name: translateSalatName(jamWith, jamWith, t),
                                      })}
                                    </motion.button>
                                  )}
                                {/* After-salat toggles */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-white/30 text-xs shrink-0">
                                    {t('salatTracker.afterSalat', 'After salat:')}
                                  </span>
                                  <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() =>
                                      handleSubTag(prayerId, 'tasbeeh', !(entry?.tasbeeh ?? false))
                                    }
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all ${
                                      entry?.tasbeeh
                                        ? 'bg-brand-info/20 border-brand-info/60 text-brand-info'
                                        : 'bg-brand-deep border-brand-border text-white/40 hover:text-white/70'
                                    }`}
                                  >
                                    {t('salatTracker.tasbeeh', '📿 Tasbeeh')}
                                  </motion.button>
                                  <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() =>
                                      handleSubTag(
                                        prayerId,
                                        'ayatulKursi',
                                        !(entry?.ayatulKursi ?? false)
                                      )
                                    }
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all ${
                                      entry?.ayatulKursi
                                        ? 'bg-brand-gold/20 border-brand-gold/60 text-brand-gold'
                                        : 'bg-brand-deep border-brand-border text-white/40 hover:text-white/70'
                                    }`}
                                  >
                                    {t('salatTracker.ayatulKursi', '📖 Ayatul Kursi')}
                                  </motion.button>
                                </div>

                                {/* Read now — authentic recitations tied to this prayer,
                                each opening directly in the Quran reader. */}
                                {(() => {
                                  const recs = recitationsFor(prayerId, isFridayToday);
                                  if (recs.length === 0) return null;
                                  // Deliberately understated: plain inline links, no
                                  // button chrome. These are optional sunnah, and a
                                  // row of chunky buttons read as a to-do list —
                                  // the opposite of the intent.
                                  return (
                                    <div className="pt-1.5 border-t border-brand-emerald/5">
                                      <p className="text-white/25 text-[11px] leading-relaxed">
                                        <span className="text-white/20">
                                          {t('salatTracker.optionalPrefix', 'Optional')} ·{' '}
                                        </span>
                                        {recs.map((r, i) => (
                                          <span key={r.id}>
                                            {i > 0 && <span className="text-white/15"> · </span>}
                                            <button
                                              onClick={() => navigate(recitationHref(r))}
                                              title={
                                                r.weak
                                                  ? `${r.note} — ${r.source} (${r.grade}). ${r.caveat ?? ''}`
                                                  : `${r.note} — ${r.source} (${r.grade})`
                                              }
                                              className={`underline underline-offset-2 decoration-dotted transition-colors ${
                                                r.fridayOnly
                                                  ? 'text-brand-gold/60 hover:text-brand-gold'
                                                  : 'text-white/30 hover:text-brand-emerald'
                                              }`}
                                            >
                                              {r.label}
                                            </button>
                                            {/* A weak narration must never sit next
                                            to ṣaḥīḥ ones unmarked. */}
                                            {r.weak && (
                                              <span
                                                title={r.caveat}
                                                className="ml-1 text-[9px] uppercase tracking-wide text-brand-gold/50 border border-brand-gold/25 rounded px-1 py-px align-middle"
                                              >
                                                {t('salatTracker.daif', 'ḍaʿīf')}
                                              </span>
                                            )}
                                          </span>
                                        ))}
                                      </p>
                                    </div>
                                  );
                                })()}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Optional "why missed" reason picker — never required */}
                        <AnimatePresence>
                          {status === 'missed' && isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.18 }}
                              className="overflow-hidden border-t border-brand-emerald/10"
                            >
                              <div className="px-3 py-2.5 flex items-center gap-1.5 flex-wrap">
                                <span className="text-white/30 text-[11px] sm:text-xs">
                                  {t('salatTracker.missedReasonLabel', 'Why? (optional)')}
                                </span>
                                {MISSED_REASONS.map((reason) => (
                                  <motion.button
                                    key={reason}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => handleMissedReason(prayerId, reason)}
                                    className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold border transition-all ${
                                      entry?.missedReason === reason
                                        ? 'bg-red-500/20 border-red-400/60 text-red-300'
                                        : 'bg-brand-deep border-brand-border text-white/40 hover:text-white/70'
                                    }`}
                                  >
                                    {t(`salatTracker.missedReason.${reason}`, reason)}
                                  </motion.button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Expand/collapse toggle for sub-tags (completed/kaza) or the
                        optional missed-reason picker */}
                        {(hasSubTag || status === 'missed') && !isFuture && (
                          <button
                            onClick={() => setExpandedPrayer(isExpanded ? null : prayerId)}
                            className="w-full flex items-center justify-center gap-1 py-1 border-t border-brand-emerald/5 text-white/20 hover:text-white/50 text-xs transition-colors"
                          >
                            {isExpanded
                              ? t('salatTracker.less', '▲ Less')
                              : t('salatTracker.details', '▾ Details')}
                            {status === 'completed' &&
                              entry?.location &&
                              entry.location !== 'home' && (
                                <span className="text-brand-emerald/60">
                                  {LOCATION_TAGS.find((loc) => loc.value === entry.location)?.emoji}
                                </span>
                              )}
                            {entry?.tasbeeh && <span className="text-brand-info/60">📿</span>}
                            {entry?.ayatulKursi && <span className="text-brand-gold/60">📖</span>}
                            {entry?.missedReason && (
                              <span className="text-red-400/60">
                                {t(
                                  `salatTracker.missedReason.${entry.missedReason}`,
                                  entry.missedReason
                                )}
                              </span>
                            )}
                          </button>
                        )}

                        {/* Tarawih — only during Ramadan, attached to Isha because
                        that is when it is prayed. Writes to the SAME
                        FastingLog.tarawih field as /ramadan, so marking it in
                        either place shows in both. */}
                        {prayerId === 'isha' && isRamadanNow() && isToday && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTarawih();
                            }}
                            className={`w-full px-3 py-2.5 border-t flex items-center gap-2 text-left transition-colors ${
                              ramadanTodayLog?.tarawih
                                ? 'border-brand-info/30 bg-brand-info/15'
                                : 'border-brand-info/15 bg-brand-info/[0.06] hover:bg-brand-info/10'
                            }`}
                          >
                            <span className="text-base shrink-0">🕌</span>
                            <span className="flex-1 min-w-0">
                              <span
                                className={`block font-bold text-xs ${ramadanTodayLog?.tarawih ? 'text-brand-info' : 'text-brand-info/70'}`}
                              >
                                {t('salatTracker.tarawihTonight', 'Tarawih tonight')}
                              </span>
                              <span className="block text-white/30 text-[11px]">
                                {t(
                                  'salatTracker.tarawihDesc',
                                  'Ramadan nights — prayed after Isha'
                                )}
                              </span>
                            </span>
                            <span
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border shrink-0 ${
                                ramadanTodayLog?.tarawih
                                  ? 'bg-brand-info/25 border-brand-info/50 text-brand-info'
                                  : 'bg-brand-deep border-brand-border text-white/40'
                              }`}
                            >
                              {ramadanTodayLog?.tarawih
                                ? t('salatTracker.prayed', '✅ Prayed')
                                : t('salatTracker.markDone', 'Mark done')}
                            </span>
                          </button>
                        )}

                        {/* Sunnah/nafl rak'ah guidance — tied to the prayer's
                            OWN window (isCurrent), not "any time from when it
                            started onward" (!isFuture): the latter never
                            closed once a prayer's time had passed, so Fajr's
                            guidance was still showing at Isha. Independently
                            toggleable per emphasis (Salat settings). */}
                        {/* Musafir jamʿ — pray the pair together. On Ẓuhr/Maghrib
                            (its own time, partner not yet due): taqdīm. On ʿAṣr/ʿIshāʾ
                            (its own time, partner still unprayed): taʾkhīr. */}
                        {canJoinPrayers &&
                          isToday &&
                          jamWith &&
                          (() => {
                            const partnerStatus = normaliseStatus(log?.prayers[jamWith]?.status);
                            const isFirst = prayerId === 'dhuhr' || prayerId === 'maghrib';
                            const offer = isFirst
                              ? (isCurrent || hasSubTag) &&
                                status !== 'missed' &&
                                partnerStatus === 'pending' &&
                                isFuturePrayer(jamWith, todayPrayerTimes?.times)
                              : isCurrent && status !== 'missed' && partnerStatus === 'pending';
                            if (!offer) return null;
                            const first = isFirst ? prayerId : jamWith;
                            const second = isFirst ? jamWith : prayerId;
                            const names = {
                              a: translateSalatName(first, first, t),
                              b: translateSalatName(second, second, t),
                            };
                            return (
                              <div className="px-3 py-2.5 border-t border-brand-gold/20 bg-brand-gold/5">
                                <div className="flex items-center gap-3">
                                  <span className="text-base shrink-0">🔗</span>
                                  <p className="flex-1 min-w-0 text-white/55 text-xs leading-snug">
                                    {isFirst
                                      ? t(
                                          'salatTracker.jamOfferTaqdim',
                                          'On the move? Pray {{a}} and {{b}} together now, in {{a}} time (jamʿ taqdīm).',
                                          names
                                        )
                                      : t(
                                          'salatTracker.jamOfferTakhir',
                                          '{{a}} not prayed yet? Pray {{a}} and {{b}} together now, in {{b}} time (jamʿ taʾkhīr).',
                                          names
                                        )}
                                  </p>
                                  <motion.button
                                    whileTap={{ scale: 0.92 }}
                                    onClick={() => joinPair(first, isFirst ? 'taqdim' : 'takhir')}
                                    className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold bg-brand-gold/20 border border-brand-gold/60 text-brand-gold hover:bg-brand-gold/30"
                                  >
                                    {t('salatTracker.jamBoth', '{{a}} + {{b}} ✓', names)}
                                  </motion.button>
                                </div>
                                <a
                                  href={
                                    isFirst
                                      ? 'https://sunnah.com/tirmidhi:553'
                                      : 'https://sunnah.com/bukhari:1111'
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="ml-8 mt-1 inline-block text-brand-gold/45 text-[11px] underline hover:text-brand-gold/80"
                                >
                                  📖{' '}
                                  {translateReference(
                                    isFirst
                                      ? 'Jāmiʿ al-Tirmidhī 553 · Ṣaḥīḥ (al-Albānī)'
                                      : 'Ṣaḥīḥ al-Bukhārī 1111 · Ṣaḥīḥ',
                                    i18n.language
                                  )}
                                </a>
                              </div>
                            );
                          })()}

                        {/* Musafir: the regular sunnah may be left on a journey
                            (Ibn ʿUmar, Muslim 689a) — Fajr's two are kept, so
                            Fajr falls through to its normal guidance below. */}
                        {isCurrent && travelDay && prayerId !== 'fajr' && (
                          <div className="px-3 py-2.5 border-t border-brand-info/20 flex items-start gap-2 bg-brand-info/5">
                            <span className="text-base shrink-0">🧳</span>
                            <div className="min-w-0">
                              <p className="text-brand-info font-bold text-xs leading-tight">
                                {t(
                                  'salatTracker.travelSunnahTitle',
                                  'On a journey, the sunnah is light'
                                )}
                              </p>
                              <p className="text-white/30 text-xs leading-relaxed mt-0.5">
                                {t(
                                  'salatTracker.travelSunnahDesc',
                                  "The Prophet ﷺ left the regular sunnah of Ẓuhr, Maghrib and ʿIshāʾ on journeys; he kept Fajr's two and Witr. Any nafl is still yours to pray."
                                )}
                              </p>
                              <a
                                href="https://sunnah.com/muslim:689a"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-brand-info/50 text-xs underline hover:text-brand-info/80 transition-colors mt-0.5 inline-block"
                              >
                                📖 {translateReference('Ṣaḥīḥ Muslim 689a', i18n.language)}
                              </a>
                            </div>
                          </div>
                        )}

                        {isCurrent &&
                          !(travelDay && prayerId !== 'fajr') &&
                          (() => {
                            // Friday's Dhuhr slot IS Jumu'ah — its sunnah
                            // guidance is genuinely different, not a fallback
                            // to Dhuhr's own rawātib (see sunnahGuide.ts).
                            const guide = isJumuah ? JUMUAH_SUNNAH_GUIDE : SUNNAH_GUIDE[prayerId];
                            if (!guide) return null;
                            const showMuakkadah = getShowSunnahGuide();
                            const showNafl = getShowNaflGuide();
                            const slots: Array<{ slot: SunnahSlot; position: 'before' | 'after' }> =
                              [];
                            if (guide.before)
                              slots.push({ slot: guide.before, position: 'before' });
                            if (guide.after) slots.push({ slot: guide.after, position: 'after' });
                            return slots.map(({ slot, position }) => {
                              const visible =
                                slot.emphasis === 'muakkadah' ? showMuakkadah : showNafl;
                              if (!visible) return null;
                              return (
                                <SunnahGuidanceRow
                                  key={`${prayerId}-${position}`}
                                  slot={slot}
                                  position={position}
                                  lang={i18n.language}
                                />
                              );
                            });
                          })()}

                        {/* Witr reminder — only once Isha has actually started (not
                            while it's still upcoming today) */}
                        {prayerId === 'isha' && !isFuture && (
                          <div className="px-3 py-2.5 border-t border-brand-gold/20 flex items-start gap-2 bg-brand-gold/5">
                            <span className="text-base shrink-0">🕯️</span>
                            <div className="min-w-0">
                              <p className="text-brand-gold font-bold text-xs leading-tight">
                                {t(
                                  'salatTracker.witrReminderTitle',
                                  "Don't forget Witr — it's wājib!"
                                )}
                              </p>
                              <p className="text-white/30 text-xs leading-relaxed mt-0.5">
                                {t(
                                  'salatTracker.witrReminderDesc',
                                  "Pray Witr after Isha before Fajr — usually 3 rak'ahs with Qunūt du'ā. The Prophet ﷺ never abandoned it, even while travelling."
                                )}
                              </p>
                              <a
                                href="https://sunnah.com/bukhari:998"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-brand-gold/50 text-xs underline hover:text-brand-gold/80 transition-colors mt-0.5 inline-block"
                              >
                                📖 {translateReference('Ṣaḥīḥ al-Bukhārī 998', i18n.language)}
                              </a>
                            </div>
                          </div>
                        )}

                        {/* Istihadha wudu-renewal reminder — only for TODAY's
                        prayers, and only while her logged cycle is actively
                        flagged beyond the madhab's hayd/nifas maximum. */}
                        {isToday && !isFuture && cycleActive?.beyondMax && (
                          <div className="px-3 py-2.5 border-t border-brand-pink/20 flex items-start gap-2 bg-brand-pink/5">
                            <span className="text-base shrink-0">🩸</span>
                            <div className="min-w-0">
                              <p className="text-brand-pink font-bold text-xs leading-tight">
                                {t(
                                  'salatTracker.istihadaReminderTitle',
                                  'Fresh wuḍū for this prayer'
                                )}
                              </p>
                              <p className="text-white/30 text-xs leading-relaxed mt-0.5">
                                {t(
                                  'salatTracker.istihadaReminderDesc',
                                  "You're in istiḥāḍa — perform wuḍū again right before this prayer, then pray as usual."
                                )}
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate('/cycle');
                                }}
                                className="text-brand-pink/50 text-xs underline hover:text-brand-pink/80 transition-colors mt-0.5 inline-block"
                              >
                                {t(
                                  'salatTracker.istihadaReminderLink',
                                  '🌸 Learn more in Rayhanah'
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Nafl Prayer card — tile-grid redesign */}
              {!isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.24 }}
                  layout
                  className={`rounded-2xl border overflow-hidden transition-colors ${
                    naflEntry.completed
                      ? 'bg-brand-info/10 border-brand-info/40'
                      : 'bg-brand-surface border-brand-border'
                  }`}
                >
                  {/* Header row */}
                  <div className="p-3.5 flex items-center gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-2xl shrink-0">📿</span>
                      <div className="min-w-0">
                        <p
                          className={`font-bold text-sm leading-none ${naflEntry.completed ? 'text-brand-info' : 'text-white/60'}`}
                        >
                          {t('salatTracker.naflPrayer', 'Nafl Prayer')}
                        </p>
                        <p className="text-white/25 text-xs mt-0.5">
                          {naflEntry.completed && (naflEntry.types?.length ?? 0) > 0
                            ? naflEntry.types
                                .map((nt) => {
                                  const m = NAFL_TYPE_META.find((mm) => mm.id === nt);
                                  return m ? translateSalatName(m.id, m.label, t) : null;
                                })
                                .filter(Boolean)
                                .join(', ')
                            : t('salatTracker.voluntaryPrayers', 'voluntary prayers')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {naflEntry.completed && naflTotalRakat > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-brand-info/15 text-brand-info text-xs font-black tabular-nums">
                          {t('salatTracker.rakatCount', "{{count}} rak'ah", {
                            count: naflTotalRakat,
                          })}
                        </span>
                      )}
                      <motion.button
                        whileTap={{ scale: 0.88 }}
                        onClick={handleNaflToggle}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          naflEntry.completed
                            ? 'bg-brand-info text-white border-brand-info shadow-[0_0_12px_rgba(90,158,142,0.35)]'
                            : 'bg-brand-deep border-brand-border text-white/50 hover:border-brand-info/50 hover:text-white/80'
                        }`}
                      >
                        {naflEntry.completed
                          ? t('salatTracker.done', '✅ Done')
                          : t('salatTracker.markDoneBtn', 'Mark Done')}
                      </motion.button>
                    </div>
                  </div>

                  {/* Expanded: tile grid + rak'ah counter */}
                  <AnimatePresence>
                    {naflEntry.completed && naflExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-brand-emerald/10"
                      >
                        <div className="px-3 py-3 space-y-3">
                          <p className="text-white/30 text-[11px] font-bold uppercase tracking-wider">
                            {t('salatTracker.selectWhatYouPrayed', 'Select what you prayed')}
                          </p>

                          {/* Tile grid — 2 columns on mobile, 3 on wider */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {SELECTABLE_NAFL_TYPES.filter((nt) =>
                              nt.id === 'tarawih' ? isRamadanNow() : true
                            ).map((nt) => {
                              const selected = (naflEntry.types ?? []).includes(nt.id);
                              const infoOpen = naflInfoExpanded === nt.id;
                              const typeRak = getTypeRakat(nt.id);
                              const isFixed = nt.id === 'awwabin';
                              return (
                                <motion.div key={nt.id} layout className="flex flex-col">
                                  <motion.button
                                    whileTap={{ scale: 0.94 }}
                                    onClick={() => handleNaflTypeToggle(nt.id)}
                                    className={`relative rounded-xl p-2.5 text-left border transition-all ${
                                      selected
                                        ? 'bg-brand-info/15 border-brand-info/50 shadow-[0_0_10px_rgba(90,158,142,0.15)]'
                                        : 'bg-brand-deep/80 border-brand-border hover:border-white/15'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-1">
                                      <span className="text-lg leading-none">{nt.emoji}</span>
                                      {selected && (
                                        <motion.span
                                          initial={{ scale: 0 }}
                                          animate={{ scale: 1 }}
                                          className="text-brand-info text-xs leading-none"
                                        >
                                          ✓
                                        </motion.span>
                                      )}
                                    </div>
                                    <p
                                      className={`text-xs font-bold mt-1.5 leading-tight ${selected ? 'text-brand-info' : 'text-white/70'}`}
                                    >
                                      {translateSalatName(nt.id, nt.label, t)}
                                    </p>
                                    <p className="text-white/20 text-[10px] mt-0.5 leading-snug">
                                      {i18n.language === 'bn' && nt.shortNoteBn
                                        ? nt.shortNoteBn
                                        : nt.shortNote}
                                    </p>
                                  </motion.button>

                                  {/* Per-type rak'ah counter (only when selected) */}
                                  {selected && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      className="overflow-hidden"
                                    >
                                      <div className="mt-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-brand-info/[0.06] border border-brand-info/15">
                                        {isFixed ? (
                                          <span className="text-brand-info/70 text-[11px] font-bold tabular-nums">
                                            {t('salatTracker.rakatCount', "{{count}} rak'ah", {
                                              count: nt.defaultRakat,
                                            })}
                                          </span>
                                        ) : (
                                          <>
                                            <motion.button
                                              whileTap={{ scale: 0.85 }}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleTypeRakat(nt.id, -1);
                                              }}
                                              disabled={typeRak <= MIN_RAKAT}
                                              className="w-6 h-6 rounded-md bg-brand-deep border border-brand-border text-white/50 font-bold text-sm flex items-center justify-center disabled:opacity-20 hover:border-brand-info/40 transition-all"
                                            >
                                              −
                                            </motion.button>
                                            <span className="text-brand-info font-black text-sm tabular-nums w-6 text-center">
                                              {typeRak}
                                            </span>
                                            <motion.button
                                              whileTap={{ scale: 0.85 }}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleTypeRakat(nt.id, 1);
                                              }}
                                              className="w-6 h-6 rounded-md bg-brand-deep border border-brand-border text-white/50 font-bold text-sm flex items-center justify-center hover:border-brand-info/40 transition-all"
                                            >
                                              +
                                            </motion.button>
                                          </>
                                        )}
                                      </div>
                                    </motion.div>
                                  )}

                                  {/* Info toggle */}
                                  <button
                                    onClick={() => setNaflInfoExpanded(infoOpen ? null : nt.id)}
                                    className="mt-0.5 text-white/15 hover:text-white/40 text-[10px] text-center transition-colors"
                                  >
                                    {infoOpen
                                      ? t('salatTracker.hide', '▲ hide')
                                      : t('salatTracker.about', 'ⓘ about')}
                                  </button>
                                  <AnimatePresence>
                                    {infoOpen && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.15 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="mt-1 p-2.5 rounded-xl bg-brand-deep border border-brand-emerald/10 space-y-1">
                                          <p className="text-white/50 text-[11px] leading-relaxed">
                                            {i18n.language === 'bn' && nt.fullNoteBn
                                              ? nt.fullNoteBn
                                              : nt.fullNote}
                                          </p>
                                          <p className="text-white/25 text-[11px] italic">
                                            {i18n.language === 'bn' && nt.hadithBn
                                              ? nt.hadithBn
                                              : nt.hadith}
                                          </p>
                                          <a
                                            href={nt.hadithUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-brand-info/50 text-[11px] underline hover:text-brand-info/80"
                                          >
                                            📖 sunnah.com
                                          </a>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Expand toggle */}
                  {naflEntry.completed && (
                    <button
                      onClick={() => setNaflExpanded(!naflExpanded)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 border-t border-brand-emerald/5 text-white/20 hover:text-white/50 text-xs transition-colors"
                    >
                      {naflExpanded
                        ? t('salatTracker.less', '▲ Less')
                        : t('salatTracker.details', '▾ Details')}
                      {!naflExpanded && (naflEntry.types?.length ?? 0) > 0 && (
                        <span className="text-brand-info/50 text-xs">
                          {naflEntry.types
                            .map((nt) => NAFL_TYPE_META.find((m) => m.id === nt)?.emoji)
                            .join(' ')}
                        </span>
                      )}
                    </button>
                  )}
                </motion.div>
              )}

              {/* Kaza debt — missed prayers owed, paid back one at a time */}
              {!isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.28 }}
                  layout
                  className={`rounded-2xl border overflow-hidden transition-colors ${
                    (debt?.totalOwed ?? 0) > 0
                      ? 'bg-brand-gold/10 border-brand-gold/40'
                      : 'bg-brand-surface border-brand-border'
                  }`}
                >
                  <button
                    onClick={() => setDebtExpanded((v) => !v)}
                    className="w-full p-3.5 flex items-center gap-3 text-left"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-2xl shrink-0">⏳</span>
                      <div className="min-w-0">
                        <p
                          className={`font-bold text-sm leading-none ${(debt?.totalOwed ?? 0) > 0 ? 'text-brand-gold' : 'text-white/60'}`}
                        >
                          {t('salatTracker.kazaDebtTitle', 'Kaza Debt')}
                        </p>
                        <p className="text-white/25 text-xs mt-0.5">
                          {(debt?.totalOwed ?? 0) > 0
                            ? t('salatTracker.kazaDebtOwed', '{{count}} prayers owed', {
                                count: debt?.totalOwed ?? 0,
                              })
                            : t('salatTracker.kazaDebtNone', 'Nothing owed — MashaAllah')}
                          {debt?.since && (
                            <span className="text-white/15">
                              {' · '}
                              {t('salatTracker.kazaDebtSince', 'since {{date}}', {
                                date: friendlyDate(debt.since, t),
                              })}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className="text-white/20 text-xs shrink-0">
                      {debtExpanded
                        ? t('salatTracker.less', '▲ Less')
                        : t('salatTracker.details', '▾ Details')}
                    </span>
                  </button>

                  <AnimatePresence>
                    {debtExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-brand-emerald/10"
                      >
                        <div className="px-3 py-3 space-y-2">
                          <p className="text-white/30 text-[11px] leading-relaxed">
                            {t(
                              'salatTracker.kazaDebtHint',
                              "Added automatically once a prayer's day passes without it being logged — no need to tap ❌ Miss yourself. Owe some from before you started tracking? Set a starting count for each below."
                            )}
                          </p>
                          {trackablePrayers.map((prayer) => {
                            const prayerId = prayer.id as PrayerId;
                            const owed = debt?.owed[prayerId] ?? 0;
                            const draft = debtDrafts[prayerId];
                            return (
                              <div
                                key={prayerId}
                                className="flex items-center gap-2 py-1.5 border-t border-brand-emerald/5 first:border-t-0"
                              >
                                <span className="text-lg shrink-0">{prayer.icon}</span>
                                <span className="text-white/60 text-xs font-semibold flex-1 min-w-0 truncate">
                                  {translateSalatName(prayer.id, prayer.name, t)}
                                </span>
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  min={0}
                                  max={9999}
                                  value={draft ?? String(owed)}
                                  title={t('salatTracker.kazaDebtSetCount', 'Set exact count')}
                                  onChange={(e) =>
                                    setDebtDrafts((d) => ({ ...d, [prayerId]: e.target.value }))
                                  }
                                  onBlur={(e) => commitDebtEdit(prayerId, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') e.currentTarget.blur();
                                    if (e.key === 'Escape') {
                                      setDebtDrafts((d) => {
                                        const next = { ...d };
                                        delete next[prayerId];
                                        return next;
                                      });
                                      e.currentTarget.blur();
                                    }
                                  }}
                                  className={`w-14 px-2 py-1 rounded-lg bg-brand-deep border text-xs text-center font-bold tabular-nums ${
                                    owed > 0
                                      ? 'border-brand-gold/40 text-brand-gold'
                                      : 'border-brand-border text-white/50'
                                  }`}
                                />
                              </div>
                            );
                          })}
                          {/* Shortcut: clickable missed-day chips so the user can
                              jump straight to a past day and mark kaza, without
                              multiple nav clicks. Uses the 90-day calendar data
                              already fetched (completed < 5 = at least one gap). */}
                          <MissedDayChips
                            calendarDataMap={calendarDataMap}
                            t={
                              t as (
                                key: string,
                                fallback: string,
                                opts?: Record<string, unknown>
                              ) => string
                            }
                            setSelectedDate={setSelectedDate}
                            setExpandedPrayer={setExpandedPrayer}
                            setCalendarOpen={setCalendarOpen}
                          />

                          {(debt?.totalOwed ?? 0) > 0 && (
                            <div className="pt-2.5 mt-1 border-t border-brand-emerald/5">
                              <button
                                onClick={() => setShowSettings(true)}
                                className="text-brand-gold/60 hover:text-brand-gold text-[11px] underline underline-offset-2"
                              >
                                {t(
                                  'salatTracker.kazaDebtResetPointer',
                                  '🌱 Reset it in ⚙️ Salat settings'
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {/* Legend */}
              <div className="card bg-brand-surface border border-brand-border rounded-2xl overflow-hidden">
                <button
                  onClick={() => setLegendExpanded((v) => !v)}
                  className="w-full card-body p-4 flex-row items-center justify-between gap-3 text-left"
                >
                  <p className="text-white/30 text-xs font-semibold uppercase tracking-wide">
                    {t('salatTracker.howItWorks', 'How it works')}
                  </p>
                  <span className="text-white/20 text-xs shrink-0">
                    {legendExpanded
                      ? t('salatTracker.less', '▲ Less')
                      : t('salatTracker.details', '▾ Details')}
                  </span>
                </button>
                <AnimatePresence>
                  {legendExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden border-t border-brand-emerald/10"
                    >
                      <div className="card-body p-4 pt-3 space-y-1.5 text-xs text-white/50">
                        <p>
                          ✅{' '}
                          <span className="text-white/70 font-medium">
                            {t('salatTracker.legendDone', 'Done')}
                          </span>{' '}
                          — {t('salatTracker.legendDoneDesc', 'prayed on time')}
                        </p>
                        <p>
                          ⏰{' '}
                          <span className="text-white/70 font-medium">
                            {t('salatTracker.legendKaza', 'Kaza')}
                          </span>{' '}
                          —{' '}
                          {t('salatTracker.legendKazaDesc', 'prayed late (still counts as prayed)')}
                        </p>
                        <p>
                          ❌{' '}
                          <span className="text-white/70 font-medium">
                            {t('salatTracker.legendMissed', 'Missed')}
                          </span>{' '}
                          — {t('salatTracker.legendMissedDesc', 'not prayed')}
                        </p>
                        <p>
                          🕌{' '}
                          <span className="text-white/70 font-medium">
                            {t('salatTracker.legendMosque', 'Mosque')}
                          </span>{' '}
                          {t('salatTracker.legendOr', 'or')} 👥{' '}
                          <span className="text-white/70 font-medium">
                            {t('salatTracker.legendJamat', 'Jamat')}
                          </span>{' '}
                          —{' '}
                          {t('salatTracker.legendLocationDesc', 'tap ▾ Details after marking done')}
                        </p>
                        <p>
                          {t(
                            'salatTracker.legendFutureLocked',
                            '🔒 Future prayers are locked until their time begins'
                          )}
                        </p>
                        <p>
                          📖{' '}
                          <span className="text-white/70 font-medium">
                            {t('salatTracker.ayatulKursiWord', 'Ayatul Kursi')}
                          </span>{' '}
                          —{' '}
                          {t(
                            'salatTracker.legendAyatulKursiDesc',
                            'toggle after marking Done/Kaza (tap ▾ Details)'
                          )}
                        </p>
                        <p>
                          📿{' '}
                          <span className="text-white/70 font-medium">
                            {t('salatTracker.legendNafl', 'Nafl')}
                          </span>{' '}
                          —{' '}
                          {t(
                            'salatTracker.legendNaflDesc',
                            "mark voluntary prayers and pick type + rak'ahs"
                          )}
                        </p>

                        <div className="pt-2.5 mt-1 border-t border-brand-emerald/10 space-y-1.5">
                          <p className="text-brand-emerald/70 font-semibold">
                            {t('salatTracker.countsItselfNow', 'Counts itself now')}
                          </p>
                          <p>
                            <Trans
                              i18nKey="salatTracker.legendTasbeehInfo"
                              defaults="📿 Tapping <1>Tasbeeh</1> adds the full after-ṣalāh count to your dhikr automatically — no more logging 33s by hand. Ayatul Kursi adds one. Un-tap to undo."
                            >
                              📿 Tapping <span className="text-white/70 font-medium">Tasbeeh</span>{' '}
                              adds the full after-ṣalāh count to your dhikr automatically — no more
                              logging 33s by hand. Ayatul Kursi adds one. Un-tap to undo.
                            </Trans>
                          </p>
                          <p>
                            <Trans
                              i18nKey="salatTracker.legendAyatulKursiAutoInfo"
                              defaults="📖 Tapping <1>Ayatul Kursi</1> (in ▾ Details) also auto-counts 1 recitation in your dhikr log — the same rule as Tasbeeh. Un-tap to undo."
                            >
                              📖 Tapping{' '}
                              <span className="text-white/70 font-medium">Ayatul Kursi</span> (in ▾
                              Details) also auto-counts 1 recitation in your dhikr log — the same
                              rule as Tasbeeh. Un-tap to undo.
                            </Trans>
                          </p>
                          <p>
                            <Trans
                              i18nKey="salatTracker.legendTasbihModeInfo"
                              defaults="⚙️ Choose <1>33·33·33 + tahlīl</1> (Muslim 597a) or <3>33·33·34</3> (Muslim 596a) in salat settings — both are authentic. Your ʿAṣr school lives there too."
                            >
                              ⚙️ Choose{' '}
                              <span className="text-white/70 font-medium">33·33·33 + tahlīl</span>{' '}
                              (Muslim 597a) or{' '}
                              <span className="text-white/70 font-medium">33·33·34</span> (Muslim
                              596a) in salat settings — both are authentic. Your ʿAṣr school lives
                              there too.
                            </Trans>
                          </p>
                          <p>
                            <Trans
                              i18nKey="salatTracker.legendAutoCountInfo"
                              defaults="🔕 Prefer to count by hand? Turn off <1>Auto-count dhikr</1> in salat settings — tags still mark as done, and Tasbih mode on the Zikr counter becomes your manual way to count them."
                            >
                              🔕 Prefer to count by hand? Turn off{' '}
                              <span className="text-white/70 font-medium">Auto-count dhikr</span> in
                              salat settings — tags still mark as done, and Tasbih mode on the Zikr
                              counter becomes your manual way to count them.
                            </Trans>
                          </p>
                          <p>
                            <Trans
                              i18nKey="salatTracker.legendReadNowInfo"
                              defaults="📖 <1>Read now</1> under each prayer opens Ayatul Kursi and the three Quls straight in the reader (Abū Dāwūd 1523, ṣaḥīḥ)."
                            >
                              📖 <span className="text-white/70 font-medium">Read now</span> under
                              each prayer opens Ayatul Kursi and the three Quls straight in the
                              reader (Abū Dāwūd 1523, ṣaḥīḥ).
                            </Trans>
                          </p>
                          <p>
                            <Trans
                              i18nKey="salatTracker.legendFridayInfo"
                              defaults="🌟 On <1>Friday</1> you'll see Sūrat al-Kahf, and a live reminder for the hour of response between ʿAṣr and Maghrib (Abū Dāwūd 1048, ṣaḥīḥ)."
                            >
                              🌟 On <span className="text-white/70 font-medium">Friday</span> you'll
                              see Sūrat al-Kahf, and a live reminder for the hour of response
                              between ʿAṣr and Maghrib (Abū Dāwūd 1048, ṣaḥīḥ).
                            </Trans>
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Guest sign-in dialog — salat logs are server-side only ── */}
      <AnimatePresence>
        {showGuestDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowGuestDialog(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 22 }}
              className="bg-brand-surface rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-brand-border text-center"
            >
              <div className="text-5xl mb-4">🕌</div>
              <h3 className="text-xl font-black text-white mb-2">
                {t('salatTracker.signInToTrack', 'Sign in to track prayers')}
              </h3>
              <p className="text-white/50 text-sm mb-6 leading-relaxed">
                {t(
                  'salatTracker.signInDesc',
                  'Your salat log is saved to your account so it syncs across devices. Create a free account to start tracking.'
                )}
              </p>
              <div className="flex flex-col gap-3">
                <button
                  className="btn bg-brand-emerald hover:bg-brand-emerald-dim text-white border-0 w-full"
                  onClick={() => {
                    sessionStorage.setItem('bustandeen_redirect', '/salat');
                    navigate('/login');
                  }}
                >
                  {t('common.signIn')}
                </button>
                <button
                  className="btn btn-ghost text-brand-emerald border border-brand-emerald/30 w-full"
                  onClick={() => {
                    sessionStorage.setItem('bustandeen_redirect', '/salat');
                    navigate('/signup');
                  }}
                >
                  {t('salatTracker.createFreeAccount', 'Create Free Account')}
                </button>
                <button
                  className="btn btn-ghost text-white/50 text-sm w-full"
                  onClick={() => setShowGuestDialog(false)}
                >
                  {t('salatTracker.justLooking', 'Just looking around')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatedBackground>
  );
}
