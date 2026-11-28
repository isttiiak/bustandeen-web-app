import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import { CheckIcon } from '@heroicons/react/24/outline';
import { celebrateSmall } from '../../utils/celebrate.js';
import { formatLocaleNumber } from '../../utils/localeDate.js';
import { addDaysYmd } from '../../utils/placeClock.js';
import { OfflineQueuedError } from '../../utils/syncOutbox.js';
import { CrescentIcon, DropIcon, FlowerIcon } from '../icons/IslamicIcons.js';
import { BTN_PRIMARY, BTN_SECONDARY } from '../bustanStyles.js';
import {
  GHUSL_STEPS,
  CHIP,
  CHIP_IDLE,
  CHIP_PINK,
  NOTE,
  DIALOG,
  BACKDROP,
} from './rayhanahShared.js';
import { Ref } from './RayhanahBits.js';
import CycleMomentQuestions, { isMarkComplete } from './CycleMomentQuestions.js';
import { type RayhanahPage } from './useRayhanahPage.js';
import type { EndMark, StartMark } from '../../hooks/useCycle.js';

export default function RayhanahDialogs({ page }: { page: RayhanahPage }) {
  const { t } = useTranslation();
  const {
    today,
    startCycle,
    startOpen,
    setStartOpen,
    startDate,
    setStartDate,
    startType,
    setStartType,
    startMark,
    setStartMark,
    endCycle,
    endOpen,
    setEndOpen,
    endOn,
    setEndOn,
    endMark,
    setEndMark,
    handleEndConfirmed,
    summary,
    ghuslOpen,
    setGhuslOpen,
    ghuslChecked,
    setGhuslChecked,
    qadaPrompt,
    setQadaPrompt,
    updateFastingProfile,
    addQada,
  } = page;

  const school = summary?.madhab ?? 'majority';

  return createPortal(
    <>
      {/* ── Start modal ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {startOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={BACKDROP}
            onClick={() => setStartOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className={`${DIALOG} border-brand-pink/40`}
              role="dialog"
              aria-label={t('rayhanah.logTheStart', 'Log the start')}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-display text-white font-bold text-xl flex items-center gap-2">
                <FlowerIcon className="w-6 h-6 text-brand-pink" />
                {t('rayhanah.logTheStart', 'Log the start')}
              </h3>
              <div>
                <label className="text-white/75 text-xs font-bold" htmlFor="cycle-start-date">
                  {t('rayhanah.startDate', 'Start date')}
                </label>
                <input
                  id="cycle-start-date"
                  type="date"
                  value={startDate}
                  max={today}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input input-bordered w-full mt-1 rounded-control bg-brand-surface/50 border-brand-border text-white"
                />
              </div>
              <div className="flex gap-2">
                {(['hayd', 'nifas'] as const).map((item) => (
                  <button
                    key={item}
                    aria-pressed={startType === item}
                    className={`flex-1 justify-center ${CHIP} rounded-control py-2 ${startType === item ? CHIP_PINK : CHIP_IDLE}`}
                    onClick={() => setStartType(item)}
                  >
                    {item === 'hayd'
                      ? t('rayhanah.periodHayd', 'Period (hayd)')
                      : t('rayhanah.postNatal', 'Post-natal (nifās)')}
                  </button>
                ))}
              </div>
              <CycleMomentQuestions
                mode="start"
                school={school}
                value={startMark}
                onChange={(m) => setStartMark(m as StartMark)}
              />
              <button
                className={`${BTN_PRIMARY} w-full`}
                disabled={startCycle.isPending || !isMarkComplete('start', school, startMark)}
                onClick={() =>
                  startCycle.mutate(
                    { date: startDate, type: startType, startMark: startMark ?? undefined },
                    {
                      onSuccess: () => setStartOpen(false),
                      // Saved on the device; it syncs when back online.
                      onError: (e) => {
                        if (e instanceof OfflineQueuedError) setStartOpen(false);
                      },
                    }
                  )
                }
              >
                {startCycle.isPending ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  t('rayhanah.beginRayhanahDays', 'Begin Rayhanah days')
                )}
              </button>
              <p className="text-white/70 text-[11px] text-center leading-relaxed">
                {t(
                  'rayhanah.startModalFooter',
                  'Salat and fasting pause automatically. Your Noor continues from dhikr, Quran and ṣalawāt.'
                )}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── End modal: which day, and before or after which prayer it stopped ───── */}
      <AnimatePresence>
        {endOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={BACKDROP}
            onClick={() => setEndOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className={`${DIALOG} border-brand-pink/40`}
              role="dialog"
              aria-label={t('rayhanah.logTheEnd', 'Log the end')}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-display text-white font-bold text-xl flex items-center gap-2">
                <FlowerIcon className="w-6 h-6 text-brand-pink" />
                {t('rayhanah.logTheEnd', 'Log the end')}
              </h3>
              <div
                className="flex gap-2"
                role="group"
                aria-label={t('rayhanah.endDayLabel', 'Which day did it stop?')}
              >
                {(['today', 'yesterday'] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={endOn === item}
                    disabled={
                      item === 'yesterday' &&
                      !!summary?.active &&
                      addDaysYmd(today, -1) < summary.active.startDate
                    }
                    className={`flex-1 justify-center ${CHIP} rounded-control py-2 ${endOn === item ? CHIP_PINK : CHIP_IDLE}`}
                    onClick={() => setEndOn(item)}
                  >
                    {item === 'today'
                      ? t('rayhanah.endToday', 'Today')
                      : t('rayhanah.endYesterday', 'Yesterday')}
                  </button>
                ))}
              </div>
              <CycleMomentQuestions
                mode="end"
                school={school}
                value={endMark}
                onChange={(m) => setEndMark(m as EndMark)}
              />
              <button
                className={`${BTN_PRIMARY} w-full`}
                disabled={endCycle.isPending || !isMarkComplete('end', school, endMark)}
                onClick={handleEndConfirmed}
              >
                {endCycle.isPending ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  t('rayhanah.endPeriod', 'My period has ended')
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Ghusl modal ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {ghuslOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={BACKDROP}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className={`${DIALOG} border-brand-emerald/40 max-h-[85vh] overflow-y-auto`}
              role="dialog"
              aria-label={t('rayhanah.welcomeBackToSalat', 'Welcome back to salat')}
            >
              <h3 className="font-display text-white font-bold text-xl flex items-center gap-2">
                <DropIcon className="w-6 h-6 text-brand-emerald" />
                {t('rayhanah.welcomeBackToSalat', 'Welcome back to salat')}
              </h3>
              <p className={NOTE}>
                {t('rayhanah.performGhuslIntro', 'Perform ghusl the way the Prophet ﷺ did')} (
                <Ref href="https://sunnah.com/bukhari:248" label="Bukhārī 248" />
                ):
              </p>
              <div className="space-y-1.5">
                {GHUSL_STEPS.map((step, i) => (
                  <button
                    key={step}
                    aria-pressed={!!ghuslChecked[i]}
                    className="w-full flex items-start gap-3 rounded-control border border-brand-border bg-brand-surface/50 px-3 py-2.5 text-left"
                    onClick={() => setGhuslChecked((c) => c.map((v, j) => (j === i ? !v : v)))}
                  >
                    <span
                      className={`w-6 h-6 rounded-full grid place-items-center border text-[11px] font-bold flex-shrink-0 ${ghuslChecked[i] ? 'bg-brand-emerald-dim border-brand-emerald-dim text-on-color' : 'border-brand-border text-white/70'}`}
                    >
                      {ghuslChecked[i] ? (
                        <CheckIcon className="w-3.5 h-3.5" />
                      ) : (
                        formatLocaleNumber(i + 1)
                      )}
                    </span>
                    <span
                      className={`text-xs leading-relaxed ${ghuslChecked[i] ? 'text-white/60 line-through' : 'text-white/85'}`}
                    >
                      {t(`rayhanah.ghuslStep${i}`, step)}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-brand-emerald text-xs leading-relaxed">
                {t(
                  'rayhanah.prayCurrentTime',
                  "Then pray the ṣalāt of the time you're now in. There are no past prayers to make up"
                )}{' '}
                (<Ref href="https://sunnah.com/muslim:335" label="Muslim 335" />
                ). {t('rayhanah.welcomeBackShort', 'Welcome back')}
              </p>
              <button
                className={`${BTN_PRIMARY} w-full`}
                onClick={() => {
                  setGhuslOpen(false);
                  celebrateSmall();
                }}
              >
                {t('rayhanah.alhamdulillah', 'Alhamdulillah')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Ramadan qada prompt ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {qadaPrompt && !ghuslOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={BACKDROP}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className={`${DIALOG} border-brand-gold/40`}
              role="dialog"
              aria-label={t('rayhanah.ramadanDaysToMakeUp', 'Ramadan days to make up')}
            >
              <h3 className="font-display text-white font-bold text-xl flex items-center gap-2">
                <CrescentIcon className="w-6 h-6 text-brand-gold" />
                {t('rayhanah.ramadanDaysToMakeUp', 'Ramadan days to make up')}
              </h3>
              <p className="text-white/80 text-sm leading-relaxed">
                {t(
                  'rayhanah.qadaPromptCount',
                  '{{count, number}} day(s) of this cycle fell in Ramadan.',
                  { count: qadaPrompt.days }
                )}{' '}
                {t('rayhanah.missedFastsMadeUp', 'Missed Ramadan fasts are made up after')} (
                <Ref href="https://sunnah.com/muslim:335" label="Muslim 335" />
                ).{' '}
                {qadaPrompt.days > 1
                  ? t('rayhanah.addThemToQada', 'Add them to your qaḍā counter?')
                  : t('rayhanah.addItToQada', 'Add it to your qaḍā counter?')}
              </p>
              <div className="flex gap-2">
                <button className={`${BTN_SECONDARY} flex-1`} onClick={() => setQadaPrompt(null)}>
                  {t('rayhanah.notNow', 'Not now')}
                </button>
                <button
                  className={`${BTN_PRIMARY} flex-1`}
                  disabled={updateFastingProfile.isPending}
                  onClick={addQada}
                >
                  <CheckIcon className="w-4 h-4" />
                  {t('rayhanah.addToQada', 'Add to qaḍā')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
}
