import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { m as motion } from 'framer-motion';
import { CheckIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { BTN_PRIMARY } from '../bustanStyles.js';
import { FajrIcon, MaghribIcon } from '../icons/IslamicIcons.js';
import ExcusedCard from '../ExcusedCard.js';
import { formatTime } from '../../utils/prayerTimes.js';
import { formatLocaleNumber } from '../../utils/localeDate.js';
import { translateReference } from '../../utils/localeReference.js';
import { INSET } from './ramadanShared.js';
import { type RamadanPage } from './useRamadanPage.js';

export default function RamadanDayArch({ page }: { page: RamadanPage }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const {
    window_,
    today,
    excusedToday,
    todayLog,
    fastedCount,
    tarawihCount,
    excusedCount,
    prayerTimes,
    fastClock,
    upsert,
    clearLog,
    confirmUnlog,
    setConfirmUnlog,
    logToday,
    yearLabel,
    dayNo,
    fastedPct,
    ClockGlyph,
  } = page;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-5 pt-10 pb-5 sm:px-6 text-center space-y-4"
    >
      <div>
        <p className="text-brand-gold text-xs font-bold uppercase tracking-widest">
          {t('ramadan.ramadanYear', 'Ramadan {{year}}', { year: yearLabel })}{' '}
          {t('hijriMonths.ah', 'AH')}
        </p>
        <h2 className="font-display text-4xl font-bold text-white mt-1">
          {t('ramadan.dayLabel', 'Day {{day}}', { day: formatLocaleNumber(dayNo) })}{' '}
          <span className="text-white/70 text-lg font-semibold">
            {t('ramadan.ofDays', 'of {{total}}', {
              total: formatLocaleNumber(window_.days.length),
            })}
          </span>
        </h2>
      </div>

      {/* Live countdown: the number a fasting person keeps glancing at. */}
      {fastClock && (
        <div
          title={
            fastClock.phase === 'suhoor'
              ? t('ramadan.suhoorClosesAt', 'Suhoor closes at {{time}}', {
                  time: prayerTimes ? formatTime(prayerTimes.sehri) : '',
                })
              : t('ramadan.iftarAt', 'Iftar at {{time}}', {
                  time: prayerTimes ? formatTime(prayerTimes.maghrib) : '',
                })
          }
          className={`mx-auto inline-flex items-center gap-2.5 pl-3 pr-4 py-2 rounded-full border shadow-elev-1 bg-brand-deep ${
            fastClock.phase === 'suhoor' ? 'border-brand-info/50' : 'border-brand-gold/50'
          }`}
        >
          <ClockGlyph
            className={`w-5 h-5 ${fastClock.phase === 'suhoor' ? 'text-brand-info' : 'text-brand-gold'}`}
            aria-hidden="true"
          />
          <span className="text-left leading-tight">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-white/70">
              {fastClock.phase === 'suhoor'
                ? t('ramadan.suhoorIn', 'Suhoor in')
                : t('ramadan.iftarIn', 'Iftar in')}
            </span>
            <span className="block text-white font-bold text-base tabular-nums">
              {fastClock.label}
            </span>
          </span>
        </div>
      )}

      {/* Month progress */}
      <div className="text-left">
        <div
          className="h-2.5 rounded-full bg-shade/30 overflow-hidden"
          role="progressbar"
          aria-valuenow={fastedPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <motion.div
            className="h-full rounded-full bg-brand-gold"
            initial={{ width: 0 }}
            animate={{ width: `${fastedPct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <p className="text-white/75 text-xs mt-1.5">
          {t('ramadan.fastedTarawihSummary', '{{fasted}} fasted · {{tarawih}} tarawih nights', {
            fasted: formatLocaleNumber(fastedCount),
            tarawih: formatLocaleNumber(tarawihCount),
          })}
          {excusedCount > 0
            ? ` · ${t('ramadan.excusedAutoQada', '{{count}} excused (auto-qaḍā)', {
                count: excusedCount,
              })}`
            : ''}
        </p>
      </div>

      {/* Suhoor / iftar */}
      {prayerTimes ? (
        <div className="grid grid-cols-2 gap-2.5">
          {(
            [
              {
                key: 'suhoor',
                Glyph: FajrIcon,
                label: t('ramadan.suhoorEndsFajr', 'Suhoor ends'),
                time: formatTime(prayerTimes.sehri),
                quote: t('fastingRules.sunnahText.0'),
                ref: 'Bukhārī 1923',
                href: 'https://sunnah.com/bukhari:1923',
              },
              {
                key: 'iftar',
                Glyph: MaghribIcon,
                label: t('ramadan.iftarMaghrib', 'Iftar (Maghrib)'),
                time: formatTime(prayerTimes.maghrib),
                quote: t('fastingRules.sunnahText.1'),
                ref: 'Bukhārī 1957',
                href: 'https://sunnah.com/bukhari:1957',
              },
            ] as const
          ).map((s) => (
            <div key={s.key} className={`${INSET} p-3`}>
              <p className="flex items-center justify-center gap-1.5 text-white/75 text-[10px] font-bold uppercase tracking-wide">
                <s.Glyph className="w-3.5 h-3.5 text-brand-gold" aria-hidden="true" />
                {s.label}
              </p>
              <p className="text-white font-bold text-xl tabular-nums mt-0.5">{s.time}</p>
              <p className="text-white/70 text-[11px] leading-snug mt-1">
                {s.quote}{' '}
                <a
                  className="text-brand-gold underline underline-offset-2"
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {translateReference(s.ref, i18n.language)}
                </a>
              </p>
            </div>
          ))}
        </div>
      ) : (
        <button
          className="inline-flex items-center gap-1 text-sm text-brand-gold font-semibold underline underline-offset-2"
          onClick={() => navigate('/prayer-times')}
        >
          {t('ramadan.setLocationPrompt', 'Set your location to see suhoor & iftar times')}
          <ChevronRightIcon className="w-4 h-4" aria-hidden="true" />
        </button>
      )}

      {/* Today's action */}
      {excusedToday ? (
        <div className="text-left">
          <ExcusedCard feature="fasting" />
        </div>
      ) : todayLog?.status === 'completed' ? (
        <div className="space-y-2">
          <span className="mx-auto w-16 h-16 rounded-full grid place-items-center bg-data-good/10 border border-data-good/40 text-data-good">
            <CheckIcon className="w-8 h-8" aria-hidden="true" />
          </span>
          <p className="text-data-good font-bold">
            {t('ramadan.dayFasted', 'Day {{day}} fasted. Taqabbal Allāh!', {
              day: formatLocaleNumber(dayNo),
            })}
          </p>
          {confirmUnlog ? (
            <p className="text-xs">
              <button
                className="text-red-400 font-semibold underline"
                onClick={() => {
                  clearLog.mutate(today);
                  setConfirmUnlog(false);
                }}
              >
                {t('ramadan.yesRemoveIt', 'Yes, remove it')}
              </button>
              <button
                className="text-white/75 font-semibold ml-4"
                onClick={() => setConfirmUnlog(false)}
              >
                {t('ramadan.keep', 'Keep')}
              </button>
            </p>
          ) : (
            <button
              className="text-white/65 text-[11px] underline"
              onClick={() => setConfirmUnlog(true)}
            >
              {t('ramadan.loggedByMistake', 'logged by mistake?')}
            </button>
          )}
        </div>
      ) : (
        // No "Intending" here: Ramadan is farḍ, so the intention is
        // assumed; offering it as a choice framed an obligation as
        // optional (Istiak). Voluntary fasts keep it in /fasting.
        <button
          className={`${BTN_PRIMARY} w-full h-12 text-base`}
          disabled={upsert.isPending}
          onClick={() => logToday('completed')}
        >
          <CheckIcon className="w-5 h-5" aria-hidden="true" />
          {t('ramadan.iFastedToday', 'I fasted today')}
        </button>
      )}
      {/* Tarawih lives in the salat card below, directly under Isha. */}
    </motion.section>
  );
}
