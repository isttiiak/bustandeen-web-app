import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { type RamadanWindow } from '../../utils/ramadan.js';
import { formatLocaleNumber } from '../../utils/localeDate.js';
import { CrescentIcon } from '../icons/IslamicIcons.js';
import { CARD, SECTION_TITLE } from '../bustanStyles.js';
import { NOTE } from './rayhanahShared.js';
import { Ref } from './RayhanahBits.js';

export default function RayhanahFastingMakeup({
  qadaOwed,
  qadaCompleted,
  qadaRemaining,
  showRamadanQadaWarning,
  ramadanWindow,
}: {
  qadaOwed: number;
  qadaCompleted: number;
  qadaRemaining: number;
  showRamadanQadaWarning: boolean;
  ramadanWindow: RamadanWindow;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <section className={`${CARD} p-5`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className={SECTION_TITLE}>
          <CrescentIcon className="w-5 h-5 text-brand-gold" />
          {t('rayhanah.fastingMakeupTitle', 'Fasting makeup')}
        </h2>
        <button
          className="inline-flex items-center gap-0.5 text-brand-gold text-xs font-bold hover:underline"
          onClick={() => navigate('/fasting')}
        >
          {t('rayhanah.openTrackerArrow', 'Open tracker')}
          <ChevronRightIcon className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className={`${NOTE} mt-1`}>
        {t('rayhanah.missedFastsMadeUp', 'Missed Ramadan fasts are made up after')} (
        <Ref href="https://sunnah.com/muslim:335" label="Muslim 335" />
        ).
      </p>
      {showRamadanQadaWarning && (
        <p className="text-brand-gold text-xs mt-2 leading-relaxed flex items-start gap-1.5">
          <CrescentIcon className="w-4 h-4 shrink-0" />
          {t(
            'rayhanah.ramadanQadaWarning',
            'Ramadan starts in {{days, number}} days, and {{count, number}} still to go before then.',
            {
              days: ramadanWindow.daysUntil,
              count: qadaRemaining,
            }
          )}
        </p>
      )}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          {
            n: qadaOwed,
            label: t('rayhanah.owed', 'owed'),
            tone: 'text-brand-gold',
          },
          {
            n: qadaCompleted,
            label: t('rayhanah.madeUp', 'made up'),
            tone: 'text-brand-emerald',
          },
          {
            n: qadaRemaining,
            label: t('rayhanah.remaining', 'remaining'),
            tone: 'text-white',
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-control border border-brand-border bg-brand-surface/50 p-3 text-center"
          >
            <p className={`font-display text-2xl font-bold ${s.tone}`}>{formatLocaleNumber(s.n)}</p>
            <p className="text-white/70 text-[10px] font-bold uppercase mt-1">{s.label}</p>
          </div>
        ))}
      </div>
      <p className="text-white/70 text-[11px] mt-3 leading-relaxed">
        {qadaRemaining === 1
          ? t('rayhanah.oneDayToGo', 'One more day to go. You can do it!')
          : t(
              'rayhanah.daysRemainingNote',
              '{{count, number}} days remaining. Take your time; every made-up fast counts.',
              { count: qadaRemaining }
            )}
      </p>
    </section>
  );
}
