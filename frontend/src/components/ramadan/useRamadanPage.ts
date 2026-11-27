import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FajrIcon, MaghribIcon } from '../icons/IslamicIcons.js';
import {
  useFastingHistory,
  useUpsertFastingLog,
  useClearFastingLog,
} from '../../hooks/useFasting.js';
import { useCycleSummary } from '../../hooks/useCycle.js';
import { useSalatLog } from '../../hooks/useSalatLog.js';
import { useAnalytics } from '../../hooks/useAnalytics.js';
import { useQuranSummary } from '../../hooks/useQuran.js';
import { getRamadanWindow, nightFastDate } from '../../utils/ramadan.js';
import { getTrackingDay } from '../../utils/trackingDay.js';
import { calcPrayerTimes, calcPrayerTimesForDay } from '../../utils/prayerTimes.js';
import { addDaysYmd, placeYmd } from '../../utils/placeClock.js';
import { celebrateFast } from '../../utils/celebrate.js';
import { formatLocaleNumber } from '../../utils/localeDate.js';
import { useSignInGate } from '../SignInSheet.js';

import { ASHRA_META, type WorshipId } from './ramadanShared.js';

/** The Ramadan tracker's state: today's fast, the month's logs, suhoor and iftar, the night. */
export function useRamadanPage() {
  const { t } = useTranslation();
  // Open to guests (U10): the first save asks to sign in.
  const gate = useSignInGate('ramadan');
  const today = getTrackingDay();
  const window_ = useMemo(() => getRamadanWindow(), []);

  const { data: history } = useFastingHistory(90, true);
  const { data: cycleSummary } = useCycleSummary();
  const upsert = useUpsertFastingLog();
  const clearLog = useClearFastingLog();
  const [confirmUnlog, setConfirmUnlog] = useState(false);

  const logsByDate = useMemo(() => {
    const m = new Map<string, { status: string; tarawih?: boolean }>();
    for (const l of history ?? []) {
      if (l.category === 'ramadan')
        m.set(l.date, { status: l.status, tarawih: (l as { tarawih?: boolean }).tarawih });
    }
    return m;
  }, [history]);

  // Rayhanah excused intervals (female users): flower days on the grid
  const isExcused = (day: string): boolean => {
    for (const l of cycleSummary?.logs ?? []) {
      const end = l.endDate ?? (cycleSummary?.active ? today : l.startDate);
      if (l.startDate <= day && day <= end) return true;
    }
    return false;
  };
  const excusedToday = isExcused(today);

  const ASHRA = ASHRA_META.map((a) => ({
    ...a,
    label: t(a.labelKey),
    sub: t(a.subKey),
    note: a.noteKey ? t(a.noteKey) : '',
  }));

  const todayLog = logsByDate.get(today);
  const fastedCount = window_.days.filter(
    (d) => logsByDate.get(d.date)?.status === 'completed'
  ).length;
  const tarawihCount = window_.days.filter((d) => logsByDate.get(d.date)?.tarawih).length;
  const excusedCount = window_.days.filter((d) => d.date <= today && isExcused(d.date)).length;

  // Suhoor/iftar from the saved location
  const prayerTimes = useMemo(() => {
    try {
      const raw = localStorage.getItem('bustandeen_location');
      if (!raw) return null;
      const loc = JSON.parse(raw) as { latitude: number; longitude: number };
      return calcPrayerTimes(loc.latitude, loc.longitude, new Date());
    } catch {
      return null;
    }
  }, []);

  // Tomorrow's end of sehri, for the post-Maghrib rollover below. Recomputed
  // rather than reusing today's, because Fajr drifts a minute or two each day.
  const tomorrowSehri = useMemo(() => {
    try {
      const raw = localStorage.getItem('bustandeen_location');
      if (!raw) return null;
      const loc = JSON.parse(raw) as { latitude: number; longitude: number };
      const tomorrow = addDaysYmd(placeYmd(loc.latitude, loc.longitude, new Date()), 1);
      return calcPrayerTimesForDay(loc.latitude, loc.longitude, tomorrow).sehri;
    } catch {
      return null;
    }
  }, []);

  // Ticks once a second only while the page is open — the countdown is the
  // number a fasting person keeps glancing at, so it has to move.
  const [nowTs, setNowTs] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  /** Whose night it is now (R10): a Ramadan night belongs to the fast that
   * follows it, so after Maghrib it is tomorrow's fast (the 21st night begins
   * at iftar of the 20th fast). `isNight`: between Maghrib and Fajr. Without
   * a location, the tracking day. Recomputed once a minute. */
  const nowMinute = Math.floor(nowTs / 60_000);
  const night = useMemo(() => {
    try {
      const raw = localStorage.getItem('bustandeen_location');
      if (!raw) return { date: today, isNight: false };
      const loc = JSON.parse(raw) as { latitude: number; longitude: number };
      const now = new Date(nowMinute * 60_000);
      const placeDate = placeYmd(loc.latitude, loc.longitude, now);
      const times = calcPrayerTimesForDay(loc.latitude, loc.longitude, placeDate);
      return {
        date: nightFastDate(now, placeDate, times.maghrib),
        isNight: now >= times.maghrib || now < times.fajr,
      };
    } catch {
      return { date: today, isNight: false };
    }
  }, [nowMinute, today]);
  const nightDay = window_.days.find((d) => d.date === night.date) ?? null;
  const nightLog = history?.find((l) => l.category === 'ramadan' && l.date === night.date);

  /** Where we are in the fasting day: counting down to suhoor closing (before
   * the end of sehri) or to iftar (between it and Maghrib). Null after Maghrib — the
   * fast is done, nothing left to count. */
  const fastClock = useMemo(() => {
    if (!prayerTimes) return null;
    const now = nowTs;
    const sehri = prayerTimes.sehri.getTime();
    const maghrib = prayerTimes.maghrib.getTime();

    const fmt = (ms: number) => {
      const s = Math.max(0, Math.floor(ms / 1000));
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      return h > 0
        ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
        : `${m}:${String(sec).padStart(2, '0')}`;
    };

    if (now < sehri) {
      return { phase: 'suhoor' as const, label: fmt(sehri - now), progressPct: 0 };
    }
    if (now < maghrib) {
      const pct = Math.round(((now - sehri) / (maghrib - sehri)) * 100);
      return {
        phase: 'fasting' as const,
        label: fmt(maghrib - now),
        progressPct: Math.min(100, Math.max(0, pct)),
      };
    }
    // After Maghrib the fast is done, but the pill must NOT disappear for the
    // rest of the night — that is the stretch when people are planning suhoor.
    // Roll over to TOMORROW's end of sehri (recomputed, since dawn drifts daily).
    if (tomorrowSehri) {
      return {
        phase: 'suhoor' as const,
        label: fmt(tomorrowSehri.getTime() - now),
        progressPct: 0,
      };
    }
    return null;
  }, [prayerTimes, tomorrowSehri, nowTs]);

  // Live numbers for the worship strip, pulled from the trackers the user
  // already fills in — nothing new to log, just nothing to go hunting for.
  const { data: salatLog } = useSalatLog(today);
  const { data: zikrAnalytics } = useAnalytics(1);
  const { data: quranSummary } = useQuranSummary();

  const worshipToday = useMemo((): Record<
    WorshipId,
    { value: string; suffix?: string; hint: string }
  > => {
    const fardDone = (['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).filter((p) => {
      const s = salatLog?.prayers?.[p]?.status;
      return s === 'completed' || s === 'kaza';
    }).length;

    const naflRakat = salatLog?.nafl?.completed ? (salatLog.nafl.rakat ?? 0) : 0;
    const naflKinds = salatLog?.nafl?.types?.length ?? 0;

    const ayat = quranSummary?.todayAyat ?? 0;
    const goalAyat = quranSummary?.profile?.dailyGoalAyat ?? 0;

    const zikrTotal = zikrAnalytics?.today?.total ?? 0;
    const zikrGoal = zikrAnalytics?.goal?.dailyTarget ?? 0;

    return {
      salat: {
        value: String(fardDone),
        suffix: '/5',
        hint: fardDone === 5 ? t('ramadan.allFive') : t('ramadan.tapToLog'),
      },
      nafl: {
        value: String(naflRakat),
        suffix: naflRakat ? ` ${t('ramadan.rakah')}` : '',
        hint: naflKinds
          ? t('ramadan.naflKinds', { count: naflKinds })
          : naflRakat
            ? t('ramadan.addWhichKind')
            : t('ramadan.noneLoggedYet'),
      },
      quran: {
        value: String(ayat),
        suffix: goalAyat ? `/${goalAyat}` : ` ${t('ramadan.ayat')}`,
        hint: goalAyat && ayat >= goalAyat ? t('ramadan.goalMet') : t('ramadan.keepReading'),
      },
      zikr: {
        value: String(zikrTotal),
        suffix: zikrGoal ? `/${zikrGoal}` : '',
        hint: zikrGoal && zikrTotal >= zikrGoal ? t('ramadan.goalMet') : t('ramadan.tapToCount'),
      },
    };
  }, [salatLog, zikrAnalytics, quranSummary, t]);

  const logToday = (status: 'completed' | 'intended') => {
    if (!gate.canSave()) return;
    upsert.mutate(
      { date: today, category: 'ramadan', status, tarawih: todayLog?.tarawih ?? false },
      {
        onSuccess: () => {
          if (status === 'completed') celebrateFast();
        },
      }
    );
  };
  // Tarawih is saved on the fast its night belongs to (R10), so night 21 is
  // fast 21's row in every tracking-day mode. A fast with no row yet gets
  // its intention with it (the niyyah is made the night before); a row that
  // exists keeps its status, Hijri label and note.
  const nightTarawih = !!(nightLog as { tarawih?: boolean } | undefined)?.tarawih;
  const toggleTarawih = () => {
    if (!nightDay) return;
    if (!gate.canSave()) return;
    upsert.mutate({
      date: night.date,
      category: 'ramadan',
      status: (nightLog?.status as 'completed' | 'intended' | 'broken' | undefined) ?? 'intended',
      hijri: nightLog?.hijri,
      note: nightLog?.note,
      tarawih: !nightTarawih,
    });
  };

  const yearLabel =
    window_.hijriYear != null ? formatLocaleNumber(window_.hijriYear, { useGrouping: false }) : '';

  const dayNo = window_.todayNumber ?? 1;
  // From iftar of the 20th fast: the 21st night has begun.
  const inLastTen = dayNo >= 21 || (nightDay?.dayNumber ?? 0) >= 21;
  // The night we are in (or, in the day, last night): its fast's number.
  const nightNo = nightDay?.dayNumber ?? dayNo;
  const tonightOdd =
    night.isNight && nightDay && nightDay.isLastTen && nightDay.isOdd ? nightDay.dayNumber : null;
  const fastedPct = Math.round((fastedCount / Math.max(1, window_.days.length)) * 100);
  const ClockGlyph = fastClock?.phase === 'suhoor' ? FajrIcon : MaghribIcon;

  return {
    gate,
    today,
    window_,
    logsByDate,
    isExcused,
    excusedToday,
    ASHRA,
    todayLog,
    fastedCount,
    tarawihCount,
    excusedCount,
    prayerTimes,
    fastClock,
    worshipToday,
    nightDay,
    nightTarawih,
    toggleTarawih,
    upsert,
    clearLog,
    confirmUnlog,
    setConfirmUnlog,
    logToday,
    yearLabel,
    dayNo,
    inLastTen,
    nightNo,
    tonightOdd,
    fastedPct,
    ClockGlyph,
  };
}

export type RamadanPage = ReturnType<typeof useRamadanPage>;
