import toast from 'react-hot-toast';
import { BookOpenIcon, CheckIcon, ClockIcon } from '@heroicons/react/24/outline';
import { TasbihIcon } from '../icons/IslamicIcons.js';
import type { PrayerId } from '../../hooks/useSalatLog.js';
import {
  getTasbihMode,
  tasbihModeMeta,
  tasbihDeltas,
  AYATUL_KURSI_ZIKR,
  getAutoCountDhikr,
  wasDhikrCredited,
  setDhikrCredited,
} from '../../utils/salatPrefs.js';
import { todayStr } from './salatParts.js';
import type { SalatTrackerState } from './useSalatTrackerState.js';

// Audit P4-1: the Salat → Zikr credit, moved verbatim from pages/SalatTracker.tsx.
// The page passes it to useSalatPrayerHandlers (handleStatus and handleSubTag call it).
export function useSalatDhikrCredit(s: SalatTrackerState) {
  const { t, selectedDate, addCounts, flushZikr, hydrateZikr, queryClient } = s;

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

  return creditDhikr;
}
