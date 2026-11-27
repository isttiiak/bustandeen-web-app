import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import {
  CheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  LockClosedIcon,
  ScissorsIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { PrayerGlyph } from '../icons/IslamicIcons.js';
import { type PrayerId, type PrayerStatus, type SalatLog } from '../../hooks/useSalatLog.js';
import { PRAYER_META, translateSalatName } from '../../utils/prayerTimes.js';
import { formatLocaleNumber } from '../../utils/localeDate.js';
import { isQasrPrayer, FARD_RAKAT, travelRakat } from '../../utils/musafir.js';
import { STATUS_STYLE } from './salatParts.js';

/** One prayer's main row: its name and badges, its times, and the Done / Kaza / Miss buttons. */
export default function SalatPrayerRow({
  prayer,
  prayerId,
  entry,
  status,
  style,
  isCurrent,
  isOverdue,
  isToday,
  isFuture,
  isJumuah,
  isQasrRow,
  rowTravel,
  joinedEarly,
  hasSubTag,
  prayerStartTime,
  prayerEndTime,
  ishaFinalEndTime,
  handleStatus,
}: {
  prayer: (typeof PRAYER_META)[number];
  prayerId: PrayerId;
  entry: SalatLog['prayers'][PrayerId] | undefined;
  status: PrayerStatus;
  style: (typeof STATUS_STYLE)[PrayerStatus];
  isCurrent: boolean;
  isOverdue: boolean;
  isToday: boolean;
  isFuture: boolean;
  isJumuah: boolean;
  isQasrRow: boolean;
  rowTravel: boolean;
  joinedEarly: boolean;
  hasSubTag: boolean;
  prayerStartTime: string | null;
  prayerEndTime: string | null;
  ishaFinalEndTime: string | null;
  handleStatus: (prayer: PrayerId, status: PrayerStatus) => void;
}) {
  const { t } = useTranslation();

  return (
    <>
      <div className="p-3 flex items-center gap-3">
        {/* Prayer info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span
            className={`w-10 h-10 shrink-0 rounded-full border flex items-center justify-center ${
              isCurrent
                ? 'border-brand-emerald/50 text-brand-emerald'
                : isOverdue
                  ? 'border-brand-gold/40 text-brand-gold'
                  : `border-brand-border ${style.text}`
            }`}
          >
            <PrayerGlyph id={prayerId} className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <p
              className={`font-bold text-sm leading-none ${isCurrent ? 'text-brand-emerald' : isOverdue ? 'text-brand-gold' : style.text}`}
            >
              {isJumuah
                ? t('salatNames.jumuah', "Jumu'ah")
                : translateSalatName(prayer.id, prayer.name, t)}
              {isCurrent && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-brand-emerald">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald" aria-hidden="true" />
                  {t('salatTracker.nowTag', 'now')}
                </span>
              )}
              {isOverdue && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-brand-gold">
                  <ExclamationTriangleIcon className="w-3.5 h-3.5" aria-hidden="true" />
                  {prayerId === 'isha'
                    ? t('salatTracker.ishaLateTag', 'better before midnight')
                    : t('salatTracker.overdueTag', 'window closed')}
                </span>
              )}
              {(isQasrRow || (rowTravel && !isQasrPrayer(prayerId))) && (
                <span
                  className={`mt-1 flex items-center gap-1 w-fit whitespace-nowrap text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    isQasrRow ? 'bg-brand-info/15 text-brand-info' : 'bg-white/10 text-white/60'
                  }`}
                >
                  {isQasrRow && <ScissorsIcon className="w-3 h-3" aria-hidden="true" />}
                  {isQasrRow
                    ? t('salatTracker.qasrBadge', '{{n}} · qaṣr', {
                        n: formatLocaleNumber(travelRakat(prayerId)),
                      })
                    : t('salatTracker.rakatBadge', '{{n}} rakʿah', {
                        n: formatLocaleNumber(FARD_RAKAT[prayerId]),
                      })}
                </span>
              )}
              {entry?.jam && hasSubTag && (
                <span className="mt-1 flex items-center gap-1 w-fit whitespace-nowrap text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-brand-gold/15 text-brand-gold">
                  <LinkIcon className="w-3 h-3" aria-hidden="true" />
                  {t('salatTracker.jamBadge', 'joined')}
                </span>
              )}
            </p>
            {prayerStartTime && isToday && (
              <div className="mt-0.5 space-y-px">
                <p className="text-white/60 text-xs leading-none tabular-nums">
                  {prayerStartTime}
                  {prayerEndTime && (
                    <>
                      <span className="text-white/40"> → </span>
                      <span className="text-white/50">{prayerEndTime}</span>
                      {ishaFinalEndTime && (
                        <span className="text-white/40 text-[10px]">
                          {' '}
                          ({t('salatTracker.best', 'best')})
                        </span>
                      )}
                    </>
                  )}
                </p>
                {ishaFinalEndTime && (
                  <p className="text-white/40 text-[10px] leading-none">
                    {t('salatTracker.ishaFinalWindow', 'window → {{time}}', {
                      time: ishaFinalEndTime,
                    })}
                  </p>
                )}
              </div>
            )}
            {isJumuah && (
              <p className="text-brand-emerald text-xs mt-0.5">
                {t('salatTracker.jumuahReplacesDhuhr', 'Replaces Dhuhr, prayed at the mosque')}
              </p>
            )}
          </div>
        </div>

        {/* Primary actions: Done / Kaza / Miss (future prayers locked for today) */}
        {isFuture && !joinedEarly ? (
          <span className="inline-flex items-center gap-1 text-white/50 text-xs font-medium px-2 py-1 rounded-control border border-brand-border">
            <LockClosedIcon className="w-3.5 h-3.5" aria-hidden="true" />
            {t('salatTracker.notYet', 'not yet')}
          </span>
        ) : (
          <div
            className="flex items-center gap-1"
            role="group"
            aria-label={translateSalatName(prayer.id, prayer.name, t)}
          >
            {(
              [
                {
                  s: 'completed',
                  Icon: CheckIcon,
                  label: t('salatTracker.done', 'Done'),
                  on: 'bg-brand-emerald/10 border-brand-emerald text-brand-emerald',
                  hover: 'hover:border-brand-emerald/50',
                },
                {
                  s: 'kaza',
                  Icon: ClockIcon,
                  label: t('salatTracker.kaza', 'Kaza'),
                  on: 'bg-brand-gold/20 border-brand-gold text-brand-gold',
                  hover: 'hover:border-brand-gold/50',
                },
                {
                  s: 'missed',
                  Icon: XMarkIcon,
                  label: t('salatTracker.miss', 'Miss'),
                  on: 'bg-red-400/15 border-red-400 text-red-400',
                  hover: 'hover:border-red-400/50',
                },
              ] as const
            ).map((b) => (
              <motion.button
                key={b.s}
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => handleStatus(prayerId, b.s)}
                aria-pressed={status === b.s}
                className={`hit-44 flex items-center gap-1 px-1.5 py-1.5 sm:px-2.5 rounded-control text-[11px] sm:text-xs font-bold border transition-colors ${
                  status === b.s
                    ? b.on
                    : `bg-brand-deep border-brand-border text-white/60 hover:text-white ${b.hover}`
                }`}
              >
                <b.Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                {b.label}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
