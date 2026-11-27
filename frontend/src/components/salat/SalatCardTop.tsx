import { useTranslation } from 'react-i18next';
import { CheckIcon } from '@heroicons/react/24/outline';
import { MosqueIcon } from '../icons/IslamicIcons.js';
import { type PrayerId } from '../../hooks/useSalatLog.js';
import { type FastingLog } from '../../hooks/useFasting.js';
import { AdhkarCard } from '../home/TodayTimeline.js';
import { openAdhkar } from '../../utils/todayTimeline.js';
import { getShowSalatAdhkar } from '../../utils/salatPrefs.js';
import { isRamadanNow } from './salatParts.js';

/** The morning/evening adhkār window and Tarawih, under a prayer card. */
export default function SalatCardTop({
  prayerId,
  isToday,
  adhkarNow,
  ramadanTodayLog,
  toggleTarawih,
}: {
  prayerId: PrayerId;
  isToday: boolean;
  adhkarNow: ReturnType<typeof openAdhkar>;
  ramadanTodayLog: FastingLog | undefined;
  toggleTarawih: () => void;
}) {
  const { t } = useTranslation();

  return (
    <>
      {/* Morning/evening adhkār while its window is open */}
      {adhkarNow?.prayer === prayerId && getShowSalatAdhkar() && (
        <div className="px-3 pb-2.5 border-t border-brand-border/50">
          <AdhkarCard period={adhkarNow.period} until={adhkarNow.until} />
        </div>
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
          <MosqueIcon className="w-5 h-5 shrink-0 text-brand-info" />
          <span className="flex-1 min-w-0">
            <span className="block font-bold text-xs text-brand-info">
              {t('salatTracker.tarawihTonight', 'Tarawih tonight')}
            </span>
            <span className="block text-white/60 text-[11px]">
              {t('salatTracker.tarawihDesc', 'Ramadan nights, prayed after Isha')}
            </span>
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-control text-[11px] font-bold border shrink-0 ${
              ramadanTodayLog?.tarawih
                ? 'bg-brand-info/10 border-brand-info/50 text-brand-info'
                : 'bg-brand-deep border-brand-border text-white/60'
            }`}
          >
            {ramadanTodayLog?.tarawih && <CheckIcon className="w-3.5 h-3.5" aria-hidden="true" />}
            {ramadanTodayLog?.tarawih
              ? t('salatTracker.prayed', 'Prayed')
              : t('salatTracker.markDone', 'Mark done')}
          </span>
        </button>
      )}
    </>
  );
}
