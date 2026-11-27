import { useMemo } from 'react';
import toast from 'react-hot-toast';
import { LinkIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { MosqueIcon } from '../icons/IslamicIcons.js';
import { celebrateSmall, celebrateAllPrayers } from '../../utils/celebrate.js';
import type {
  PrayerId,
  PrayerStatus,
  PrayerLocation,
  MissedReason,
} from '../../hooks/useSalatLog.js';
import { PRAYER_META, getPrayerEndTime, translateSalatName } from '../../utils/prayerTimes.js';
import { isQasrPrayer, jamPartner } from '../../utils/musafir.js';
import { todayStr, isFuturePrayer, STATUS_STYLE } from './salatParts.js';
import type { SalatTrackerState } from './useSalatTrackerState.js';
import type { useSalatDhikrCredit } from './useSalatDhikrCredit.js';

// Audit P4-1: the prayer tap handlers, moved verbatim from pages/SalatTracker.tsx.
// Plain functions that close over this render's values, as before (no useCallback).
// Writes keep their order: handleStatus may un-join the partner before its own write.
export function useSalatPrayerHandlers(
  s: SalatTrackerState,
  creditDhikr: ReturnType<typeof useSalatDhikrCredit>
) {
  const {
    t,
    user,
    setShowGuestDialog,
    selectedDate,
    isToday,
    todayPrayerTimes,
    log,
    updatePrayer,
    travelPrayer,
    setExpandedPrayer,
  } = s;

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

  return {
    locationTagText,
    trackablePrayers,
    completedCount,
    normaliseStatus,
    handleStatus,
    handleMissedReason,
    setQasr,
    joinPair,
    toggleJoined,
    handleSubTag,
  };
}
