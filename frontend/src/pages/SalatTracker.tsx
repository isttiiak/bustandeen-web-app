import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import TabNav from '../components/TabNav.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { celebrateSmall, celebrateAllPrayers } from '../utils/celebrate.js';
import {
  BookOpenIcon,
  BriefcaseIcon,
  CheckIcon,
  ClockIcon,
  Cog6ToothIcon,
  LinkIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import { MosqueIcon, TasbihIcon } from '../components/icons/IslamicIcons.js';
import {
  useSalatLog,
  useUpdatePrayer,
  useUpdateNafl,
  useSalatAnalytics,
  useSalatDebt,
  useSetSalatDebt,
  NAFL_TYPE_META,
  type PrayerId,
  type PrayerStatus,
  type PrayerLocation,
  type NaflType,
  type MissedReason,
} from '../hooks/useSalatLog.js';
import {
  PRAYER_META,
  calcPrayerTimes,
  calcPrayerTimesForDay,
  getCurrentAndNextPrayer,
  getPrayerEndTime,
  formatTime,
  translateSalatName,
} from '../utils/prayerTimes.js';
import { useCycleActive } from '../hooks/useCycle.js';
import { useFastingHistory, useUpsertFastingLog } from '../hooks/useFasting.js';
import ExcusedCard from '../components/ExcusedCard.js';
import SalatSettings from '../components/SalatSettings.js';
import { openAdhkar } from '../utils/todayTimeline.js';
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
} from '../utils/salatPrefs.js';
import { getFridayHour } from '../utils/fridayHour.js';
import MusafirBanner from '../components/MusafirBanner.js';
import TravelKazaCard from '../components/TravelKazaCard.js';
import {
  useMusafir,
  musafirAppliesOn,
  musafirAppliesTo,
  isQasrPrayer,
  jamAllowed,
  jamPartner,
} from '../utils/musafir.js';
import {
  MIN_RAKAT,
  isRamadanNow,
  todayStr,
  offsetDate,
  isFuturePrayer,
  isCurrentPrayer,
  STATUS_STYLE,
} from '../components/salat/salatParts.js';
import SalatLegend from '../components/salat/SalatLegend.js';
import SalatKazaDebtCard from '../components/salat/SalatKazaDebtCard.js';
import SalatNaflCard from '../components/salat/SalatNaflCard.js';
import SignInSheet from '../components/SignInSheet.js';
import SalatMonthCalendar from '../components/salat/SalatMonthCalendar.js';
import SalatWeekStrip from '../components/salat/SalatWeekStrip.js';
import FridayHourCard from '../components/salat/FridayHourCard.js';
import SalatHero from '../components/salat/SalatHero.js';
import SalatPrayerRow from '../components/salat/SalatPrayerRow.js';
import SalatFridayTravel from '../components/salat/SalatFridayTravel.js';
import SalatPrayerDetails from '../components/salat/SalatPrayerDetails.js';
import SalatPrayerToggle from '../components/salat/SalatPrayerToggle.js';
import SalatCardTop from '../components/salat/SalatCardTop.js';
import SalatCardJoining from '../components/salat/SalatCardJoining.js';
import SalatCardGuidance from '../components/salat/SalatCardGuidance.js';

// ─── component ───────────────────────────────────────────────────────────────

export default function SalatTracker() {
  const { t } = useTranslation();
  const cycleActive = useCycleActive();
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
  // Day level (banner) vs prayer level: on the day the journey began, only
  // the prayers after the one prayed at home are travel prayers.
  const travelDay = musafirAppliesOn(musafir, selectedDate);
  const travelPrayer = (p: PrayerId) => musafirAppliesTo(musafir, selectedDate, p);
  // Joining needs both prayers of the pair to be travel prayers.
  const canJoin = (p: PrayerId) => {
    const partner = jamPartner(p);
    return (
      !!musafir &&
      jamAllowed(musafir.school) &&
      !!partner &&
      travelPrayer(p) &&
      travelPrayer(partner)
    );
  };
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
      const times = calcPrayerTimesForDay(loc.latitude, loc.longitude, selectedDate);
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

  // The adhkār window open right now (Fajr→sunrise on Fajr, Maghrib→ʿIshāʾ on
  // Maghrib), from today's times on the device, shown only on today's view.
  // Independent of selectedDate's noon, so in `maghrib` day-start mode
  // tonight's Maghrib (the new tracking day's first prayer) still gets it.
  const adhkarNow = useMemo(() => {
    if (!isToday) return null;
    try {
      const stored = localStorage.getItem('bustandeen_location');
      if (!stored) return null;
      const loc = JSON.parse(stored) as { latitude: number; longitude: number };
      return openAdhkar(calcPrayerTimes(loc.latitude, loc.longitude, minuteNow), minuteNow);
    } catch {
      return null;
    }
  }, [isToday, minuteNow]);

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
        icon: <LockClosedIcon className="w-4 h-4 shrink-0" />,
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
        qasr: travelPrayer(prayer) && isQasrPrayer(prayer) ? current?.qasr !== false : undefined,
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
      { icon: <LinkIcon className="w-4 h-4 shrink-0 text-brand-gold" />, duration: 3000 }
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
            'Prayer in congregation is 27 times superior (Bukhari 645)'
          ),
          {
            icon: <MosqueIcon className="w-4 h-4 shrink-0 text-brand-emerald" />,
            duration: 3500,
            id: 'masjid-reward',
          }
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
          icon: <ClockIcon className="w-4 h-4 shrink-0" />,
          duration: 2600,
        });
      }
      return;
    }

    if (turnedOn && !getAutoCountDhikr()) {
      toast.success(
        type === 'tasbeeh'
          ? t('salatTracker.dhikrMarkedOnly', 'Marked. Count it yourself in Tasbih mode')
          : t('salatTracker.ayatulKursiMarkedOnly', 'Ayatul Kursi marked'),
        { icon: <CheckIcon className="w-4 h-4 shrink-0 text-brand-emerald" />, duration: 2200 }
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
        { icon: <TasbihIcon className="w-4 h-4 shrink-0 text-brand-info" />, duration: 2200 }
      );
    } else {
      addCounts({ [AYATUL_KURSI_ZIKR]: sign });
      toast.success(
        turnedOn
          ? t('salatTracker.ayatulKursiCounted', 'Ayatul Kursi counted')
          : t('salatTracker.ayatulKursiRemoved', 'Ayatul Kursi removed'),
        { icon: <BookOpenIcon className="w-4 h-4 shrink-0 text-brand-gold" />, duration: 2000 }
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
    // Bustan Arch (audit T3.2): one arch hero (day + leaf marks), flat cards
    // with two radii and theme elevations, SVG icons only, no glows.
    <div className="min-h-screen bg-brand-void">
      <Seo
        title={t('salatTracker.seoTitle', 'Salat Tracker: Log Your 5 Daily Prayers')}
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
                label: t('salatTracker.tabTracker', 'Tracker'),
                to: '/salat',
                active: true,
              },
              {
                label: t('salatTracker.tabAnalytics', 'Analytics'),
                to: '/salat/analytics',
              },
            ]}
          />
        </div>
        <Link
          to="/musafir"
          aria-label={t('salatTracker.musafirAria', 'Musafir mode')}
          title={t('salatTracker.musafirAria', 'Musafir mode')}
          className={`shrink-0 p-2 rounded-control border transition-colors ${
            musafir
              ? 'border-brand-info/60 bg-brand-info/10 text-brand-info'
              : 'border-brand-border bg-brand-deep text-white/60 hover:text-brand-info hover:border-brand-info/40'
          }`}
        >
          <BriefcaseIcon className="w-5 h-5" />
        </Link>
        <button
          onClick={() => setShowSettings(true)}
          aria-label={t('salatTracker.settingsAria', 'Salat settings')}
          title={t('salatTracker.settingsAria', 'Salat settings')}
          className="shrink-0 p-2 rounded-control border border-brand-border bg-brand-deep text-white/60 hover:text-brand-emerald hover:border-brand-emerald/40 transition-colors"
        >
          <Cog6ToothIcon className="w-5 h-5" />
        </button>
      </div>
      <SalatSettings open={showSettings} onClose={() => setShowSettings(false)} />

      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-xl mx-auto space-y-5">
          {(() => {
            const excused = !!(cycleActive && selectedDate >= cycleActive.startDate);
            const marks = trackablePrayers.map((p) => {
              const raw = normaliseStatus(log?.prayers[p.id as PrayerId]?.status);
              return {
                id: p.id,
                name: p.name,
                status: (isPastDay && raw === 'pending' ? 'missed' : raw) as PrayerStatus,
              };
            });
            return (
              <SalatHero
                selectedDate={selectedDate}
                isToday={isToday}
                isAtStartDate={isAtStartDate}
                onPrev={() => {
                  if (!isAtStartDate) {
                    setSelectedDate((d) => offsetDate(d, -1));
                    setExpandedPrayer(null);
                  }
                }}
                onNext={() => {
                  setSelectedDate((d) => offsetDate(d, 1));
                  setExpandedPrayer(null);
                }}
                marks={marks}
                completedCount={completedCount}
                excused={excused}
              />
            );
          })()}

          {travelDay && musafir && (
            <MusafirBanner state={musafir} today={selectedDate} variant="salat" />
          )}
          {/* Friday: the hour of response (Abū Dāwūd 1048, ṣaḥīḥ). Shown only
              while it is actually running (ʿAṣr has begun, Maghrib has not).
              No notification permission, no cron: the page already ticks
              every minute for the prayer clock. */}
          <FridayHourCard fridayHour={fridayHour} />

          {/* Weekly summary — quick glance at the last 7 days, tap a day to jump */}
          <SalatWeekStrip
            calendarOpen={calendarOpen}
            selectedDate={selectedDate}
            setCalMonth={setCalMonth}
            setCalendarOpen={setCalendarOpen}
            setExpandedPrayer={setExpandedPrayer}
            setSelectedDate={setSelectedDate}
            weekDays={weekDays}
          />

          {/* Month calendar — full month view, tap any day to navigate there */}
          <SalatMonthCalendar
            calMonth={calMonth}
            calendarDataMap={calendarDataMap}
            calendarOpen={calendarOpen}
            selectedDate={selectedDate}
            setCalMonth={setCalMonth}
            setCalendarOpen={setCalendarOpen}
            setExpandedPrayer={setExpandedPrayer}
            setSelectedDate={setSelectedDate}
          />

          {/* Rayhanah days — salat fully excused (never made up) */}
          {cycleActive && selectedDate >= cycleActive.startDate ? (
            <ExcusedCard feature="salat" />
          ) : (
            <>
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
                    const rowTravel = travelPrayer(prayerId);
                    const isQasrRow =
                      entry?.qasr === true ||
                      (rowTravel && isQasrPrayer(prayerId) && entry?.qasr !== false);
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
                        transition={{ delay: 0.04 * i }}
                        layout
                        className={`rounded-card border overflow-hidden shadow-elev-1 hover:shadow-hover transition-[border-color,box-shadow] ${
                          isCurrent
                            ? 'bg-brand-emerald/[0.08] border-brand-emerald/60'
                            : isOverdue
                              ? 'bg-brand-gold/[0.07] border-brand-gold/40'
                              : `${style.bg} ${style.border}`
                        }`}
                      >
                        {/* Main row */}
                        <SalatPrayerRow
                          prayer={prayer}
                          prayerId={prayerId}
                          entry={entry}
                          status={status}
                          style={style}
                          isCurrent={isCurrent}
                          isOverdue={isOverdue}
                          isToday={isToday}
                          isFuture={isFuture}
                          isJumuah={isJumuah}
                          isQasrRow={isQasrRow}
                          rowTravel={rowTravel}
                          joinedEarly={joinedEarly}
                          hasSubTag={hasSubTag}
                          prayerStartTime={prayerStartTime}
                          prayerEndTime={prayerEndTime}
                          ishaFinalEndTime={ishaFinalEndTime}
                          handleStatus={handleStatus}
                        />

                        {/* Travelling on a Friday: a full-width strip rather than a
                            line in the narrow name column, which on small phones
                            wrapped to five lines beside the buttons. */}
                        <SalatFridayTravel
                          prayerId={prayerId}
                          isCivilFriday={isCivilFriday}
                          rowTravel={rowTravel}
                          isJumuah={isJumuah}
                        />

                        <SalatPrayerDetails
                          hasSubTag={hasSubTag}
                          isExpanded={isExpanded}
                          status={status}
                          isJumuah={isJumuah}
                          entry={entry}
                          prayerId={prayerId}
                          rowTravel={rowTravel}
                          isQasrRow={isQasrRow}
                          isCivilFriday={isCivilFriday}
                          isFridayToday={isFridayToday}
                          canJoin={canJoin}
                          jamWith={jamWith}
                          log={log}
                          normaliseStatus={normaliseStatus}
                          locationTagText={locationTagText}
                          handleSubTag={handleSubTag}
                          handleMissedReason={handleMissedReason}
                          setQasr={setQasr}
                          toggleJoined={toggleJoined}
                        />

                        <SalatPrayerToggle
                          hasSubTag={hasSubTag}
                          status={status}
                          isFuture={isFuture}
                          isExpanded={isExpanded}
                          entry={entry}
                          prayerId={prayerId}
                          setExpandedPrayer={setExpandedPrayer}
                        />

                        <SalatCardTop
                          prayerId={prayerId}
                          isToday={isToday}
                          adhkarNow={adhkarNow}
                          ramadanTodayLog={ramadanTodayLog}
                          toggleTarawih={toggleTarawih}
                        />

                        <SalatCardJoining
                          prayerId={prayerId}
                          isToday={isToday}
                          isCurrent={isCurrent}
                          hasSubTag={hasSubTag}
                          status={status}
                          jamWith={jamWith}
                          rowTravel={rowTravel}
                          canJoin={canJoin}
                          travelPrayer={travelPrayer}
                          normaliseStatus={normaliseStatus}
                          log={log}
                          todayPrayerTimes={todayPrayerTimes}
                          musafir={musafir}
                          joinPair={joinPair}
                        />

                        <SalatCardGuidance
                          prayerId={prayerId}
                          isToday={isToday}
                          isCurrent={isCurrent}
                          isFuture={isFuture}
                          isJumuah={isJumuah}
                          rowTravel={rowTravel}
                          cycleActive={cycleActive}
                        />
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Nafl Prayer card — tile-grid redesign */}
              <SalatNaflCard
                getTypeRakat={getTypeRakat}
                handleNaflToggle={handleNaflToggle}
                handleNaflTypeToggle={handleNaflTypeToggle}
                handleTypeRakat={handleTypeRakat}
                isLoading={isLoading}
                naflEntry={naflEntry}
                naflExpanded={naflExpanded}
                naflInfoExpanded={naflInfoExpanded}
                naflTotalRakat={naflTotalRakat}
                setNaflExpanded={setNaflExpanded}
                setNaflInfoExpanded={setNaflInfoExpanded}
              />

              {/* Kaza debt — missed prayers owed, paid back one at a time */}
              <SalatKazaDebtCard
                calendarDataMap={calendarDataMap}
                commitDebtEdit={commitDebtEdit}
                debt={debt}
                debtDrafts={debtDrafts}
                debtExpanded={debtExpanded}
                isLoading={isLoading}
                setCalendarOpen={setCalendarOpen}
                setDebtDrafts={setDebtDrafts}
                setDebtExpanded={setDebtExpanded}
                setExpandedPrayer={setExpandedPrayer}
                setSelectedDate={setSelectedDate}
                setShowSettings={setShowSettings}
                trackablePrayers={trackablePrayers}
              />

              {/* Travel kaza — the owed prayers that fell on a journey, made up
                  as travel prayers (see TravelKazaCard). Renders nothing otherwise. */}
              {!isLoading && user && <TravelKazaCard />}

              {/* Legend */}
              <SalatLegend legendExpanded={legendExpanded} setLegendExpanded={setLegendExpanded} />
            </>
          )}
        </div>
      </div>

      {/* ── Guest sign-in sheet (U10): salat logs are server-side only ── */}
      <SignInSheet
        open={showGuestDialog}
        onClose={() => setShowGuestDialog(false)}
        feature="salat"
      />
    </div>
  );
}
