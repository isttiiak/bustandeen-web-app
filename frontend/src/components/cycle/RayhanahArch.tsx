import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import { ExclamationTriangleIcon, HeartIcon } from '@heroicons/react/24/outline';
import CycleGuidance from '../CycleGuidance.js';
import { FlowerIcon, LeafIcon } from '../icons/IslamicIcons.js';
import { BTN_PRIMARY, CARD } from '../bustanStyles.js';
import { PHRASES, phraseOfDayIdx, BTN_PINK, formatDay, shiftStr } from './rayhanahShared.js';
import { Ref, Medallion } from './RayhanahBits.js';
import { type RayhanahPage } from './useRayhanahPage.js';

export default function RayhanahArch({
  page,
  user,
}: {
  page: RayhanahPage;
  user: NonNullable<RayhanahPage['user']>;
}) {
  const { t } = useTranslation();
  const {
    today,
    summary,
    isLoading,
    isError,
    refetch,
    active,
    handleEndConfirmed,
    endCycle,
    nextStartLabel,
    daysUntilNext,
    pmsAlert,
    setStartDate,
    setStartType,
    setStartOpen,
  } = page;

  const ARCH =
    'rounded-arch border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-5 pt-10 pb-6 sm:px-8 text-center';

  return isLoading ? (
    <div className={`${CARD} p-10 grid place-items-center`}>
      <span className="loading loading-spinner loading-lg text-brand-pink" />
    </div>
  ) : isError ? (
    <div className={`${CARD} p-8 text-center space-y-3`}>
      <p className="text-white/70 text-sm">
        {t('rayhanah.loadError', "Couldn't load your cycle data.")}
      </p>
      <button className={BTN_PINK} onClick={() => void refetch()}>
        {t('rayhanah.tryAgain', 'Try again')}
      </button>
    </div>
  ) : active ? (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${ARCH} border-brand-pink/40 space-y-4`}
    >
      <Medallion tone="pink">
        <FlowerIcon className="w-8 h-8" />
      </Medallion>
      <div>
        <p className="text-brand-pink text-xs font-bold uppercase tracking-widest">
          {active.type === 'nifas'
            ? t('rayhanah.nifasHeader', 'Nifās: post-natal rest')
            : t('rayhanah.haydHeader', 'Rayhanah days')}
        </p>
        <h2 className="font-display text-4xl font-bold text-white mt-2 leading-tight">
          {t('rayhanah.dayCount', 'Day {{count, number}}', { count: active.dayCount })}
        </h2>
        <p className="text-white/70 text-sm mt-1">
          {t('rayhanah.sinceDate', 'since {{date}}', { date: formatDay(active.startDate) })}
        </p>
      </div>
      <p className="text-brand-pink text-sm leading-relaxed max-w-md mx-auto">
        {t(`rayhanah.phrase${phraseOfDayIdx()}`, PHRASES[phraseOfDayIdx()]!)}
      </p>

      {active.beyondMax && (
        <div className="rounded-control bg-brand-gold/10 border border-brand-gold/40 p-4 text-left text-xs leading-relaxed text-white/80 flex gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 shrink-0 text-brand-gold" />
          <p>
            <span className="font-bold text-brand-gold">
              {t(
                'rayhanah.beyondMaxWarning',
                'Day {{dayCount, number}} has passed the {{maxDays, number}}-day maximum ({{madhab}} view{{nifas}}).',
                {
                  dayCount: active.dayCount,
                  maxDays: active.maxDays,
                  madhab: summary?.madhab === 'hanafi' ? 'Ḥanafī' : 'majority',
                  nifas: active.type === 'nifas' ? ', nifās' : '',
                }
              )}
            </span>{' '}
            {t('rayhanah.istihadaNote', 'Bleeding beyond the maximum is usually')}{' '}
            <span className="font-bold">{t('rayhanah.istihadaLabel', 'istiḥāḍa')}</span>:{' '}
            {t('rayhanah.istihadaResume', 'prayer resumes with fresh wuḍū for each prayer')} (
            <Ref href="https://sunnah.com/bukhari:306" label="Bukhārī 306" />
            ). {t('rayhanah.scholarAdvice', 'Please confirm with a scholar you trust.')}
          </p>
        </div>
      )}

      <div className="text-left">
        <CycleGuidance dayCount={active.dayCount} />
      </div>

      <div>
        <button
          className={`${BTN_PRIMARY} w-full h-12 text-base`}
          onClick={handleEndConfirmed}
          disabled={endCycle.isPending}
        >
          {endCycle.isPending ? (
            <span className="loading loading-spinner" />
          ) : (
            t('rayhanah.endPeriod', 'My period has ended')
          )}
        </button>
        <p className="text-white/70 text-[11px] mt-2">
          {t(
            'rayhanah.endPeriodHelp',
            'Tap when the bleeding has fully stopped. The ghusl guide opens next.'
          )}
        </p>
      </div>
    </motion.section>
  ) : summary?.pregnancy?.active ? (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${ARCH} border-brand-emerald/40 space-y-3`}
    >
      <Medallion tone="emerald">
        <HeartIcon className="w-8 h-8" />
      </Medallion>
      <p className="text-brand-emerald text-xs font-bold uppercase tracking-widest">
        {t('rayhanah.pregnancyHeader', 'Expecting')}
      </p>
      <h2 className="font-display text-3xl font-bold text-white leading-tight">
        {summary.pregnancy.weeksAlong != null
          ? t('rayhanah.pregnancyWeek', 'Week {{week, number}}', {
              week: summary.pregnancy.weeksAlong,
            })
          : t('rayhanah.pregnancyHeader', 'Expecting')}
      </h2>
      <p className="text-white/75 text-sm leading-relaxed max-w-md mx-auto">
        {t(
          'rayhanah.pregnancyMessage',
          "May Allah grant you ease and a safe delivery. Cycle predictions are paused while you're expecting. Salat and fasting are unaffected by pregnancy alone."
        )}
      </p>
      {summary.pregnancy.dueDate && (
        <p className="text-white/70 text-xs">
          {t('rayhanah.pregnancyDueDate', 'Expected due date: {{date}}', {
            date: formatDay(summary.pregnancy.dueDate),
          })}
        </p>
      )}
    </motion.section>
  ) : (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${ARCH} border-brand-border space-y-4`}
    >
      <Medallion tone="emerald">
        <LeafIcon className="w-8 h-8" />
      </Medallion>
      <div>
        <p className="text-brand-emerald text-xs font-bold uppercase tracking-widest">
          {t('rayhanah.daysOfPurity', 'Days of purity')}
        </p>
        <h2 className="font-display text-2xl font-bold text-white mt-2 leading-tight">
          {t('rayhanah.greeting', 'Assalamu alaikum, {{name}}', {
            name: user.displayName?.split(' ')[0] ?? t('rayhanah.sister', 'sister'),
          })}
        </h2>
      </div>
      <p className="text-white/75 text-sm leading-relaxed max-w-md mx-auto">
        {nextStartLabel ? (
          <>
            {t(
              'rayhanah.nextPeriodPrediction',
              'Based on your history, your next period is expected around'
            )}{' '}
            <span className="text-brand-pink font-bold">{nextStartLabel}</span>{' '}
            {t('rayhanah.avgCycleNote', '(avg cycle {{days, number}} days).', {
              days: summary?.prediction.avgCycleDays ?? 0,
            })}
          </>
        ) : (
          t(
            'rayhanah.firstCycleNote',
            'Log your first cycle and Rayhanah will learn your rhythm to predict the next one.'
          )
        )}
      </p>
      {pmsAlert && (
        <div className="rounded-control bg-brand-gold/10 border border-brand-gold/40 p-3 text-left text-xs leading-relaxed">
          <p className="font-bold text-brand-gold flex items-center gap-1.5">
            <FlowerIcon className="w-4 h-4 shrink-0" />
            {daysUntilNext === 0
              ? t('rayhanah.pmsToday', 'Your period may start today')
              : daysUntilNext === 1
                ? t('rayhanah.pmsTomorrow', 'Your period may start tomorrow')
                : t('rayhanah.pmsCountdown', '~{{days, number}} days until your expected period', {
                    days: daysUntilNext,
                  })}
          </p>
          <p className="text-white/75 mt-1">
            {t(
              'rayhanah.pmsSymptomNote',
              'You may notice PMS symptoms. Be gentle with yourself; extra dhikr and rest are your friends.'
            )}
          </p>
        </div>
      )}
      {summary?.prediction?.nextStart &&
        (summary?.prediction?.basedOnCycles ?? 0) > 0 &&
        !pmsAlert && (
          <div className="rounded-control bg-brand-info/10 border border-brand-info/40 p-3 text-left text-xs leading-relaxed">
            <p className="font-bold text-brand-info flex items-center gap-1.5">
              <LeafIcon className="w-4 h-4 shrink-0" />
              {t('rayhanah.fertileWindowEstimate', 'Fertile window estimate')}
            </p>
            <p className="text-white/75 mt-1">
              ~{formatDay(shiftStr(summary.prediction.nextStart, -16))} –{' '}
              {formatDay(shiftStr(summary.prediction.nextStart, -12))}
              <span className="text-white/70">
                {' '}
                ·{' '}
                {t('rayhanah.ovulationApprox', 'ovulation ~{{date}}', {
                  date: formatDay(shiftStr(summary.prediction.nextStart, -14)),
                })}
              </span>
            </p>
          </div>
        )}
      <button
        className={`${BTN_PINK} w-full h-12 text-base`}
        onClick={() => {
          setStartDate(today);
          setStartType('hayd');
          setStartOpen(true);
        }}
      >
        <FlowerIcon className="w-5 h-5" />
        {t('rayhanah.myPeriodStarted', 'My period started')}
      </button>
    </motion.section>
  );
}
