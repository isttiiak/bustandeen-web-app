import { useTranslation } from 'react-i18next';
import { ScaleIcon } from '@heroicons/react/24/outline';
import { CARD } from '../bustanStyles.js';
import type { CycleSummary, useBodyStats } from '../../hooks/useCycle.js';
import { cmToFtStr, computeBmi } from '../../utils/bodyStats.js';
import { NOTE } from './cycleAnalyticsParts.js';

/** The BMI card, shown when height and weight are saved and BMI is not hidden. */
export function CycleBmiCard({
  bodyStats,
  hideBmi,
  summary,
}: {
  bodyStats: ReturnType<typeof useBodyStats>['data'];
  hideBmi: boolean;
  summary: CycleSummary | undefined;
}) {
  const { t } = useTranslation();
  const cm = bodyStats?.heightCm ?? null;
  const kg = bodyStats?.weightKg ?? null;
  const bmi = cm && kg ? computeBmi(cm, kg) : null;
  if (!bmi || !cm || !kg || hideBmi) return null;
  const cat =
    bmi < 18.5
      ? {
          key: 'bmiUnder',
          label: 'Underweight',
          color: 'text-brand-info',
          desc: 'Below the healthy weight range.',
        }
      : bmi < 25
        ? {
            key: 'bmiNormal',
            label: 'Normal weight',
            color: 'text-brand-emerald',
            desc: 'Within the healthy weight range.',
          }
        : bmi < 30
          ? {
              key: 'bmiOver',
              label: 'Overweight',
              color: 'text-brand-gold',
              desc: 'Above the healthy weight range.',
            }
          : {
              key: 'bmiObese',
              label: 'Well above range',
              color: 'text-red-400',
              desc: 'Significantly above the healthy weight range.',
            };
  const pct = Math.min(100, Math.max(0, ((bmi - 10) / (45 - 10)) * 100));
  const ftStr = cmToFtStr(cm);

  return (
    <section className={`${CARD} p-5 space-y-4`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/70 text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
            <ScaleIcon className="w-4 h-4" />
            {t('rayhanah.bmi', 'BMI')}
          </p>
          <p className={`font-display text-4xl font-bold ${cat.color}`}>{bmi}</p>
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold ${cat.color}`}>{t(`rayhanah.${cat.key}`, cat.label)}</p>
          <p className={NOTE}>{t(`rayhanah.${cat.key}Desc`, cat.desc)}</p>
        </div>
      </div>

      {/* BMI scale bar */}
      <div className="space-y-1.5">
        {/* Four zones on the 10-45 scale: solid tokens, no gradient */}
        <div className="relative h-2.5">
          <div className="absolute inset-0 flex rounded-full overflow-hidden">
            <div className="bg-brand-info/60" style={{ width: '24.3%' }} />
            <div className="bg-brand-emerald/70" style={{ width: '18.6%' }} />
            <div className="bg-brand-gold/70" style={{ width: '14.3%' }} />
            <div className="bg-red-400/60 flex-1" />
          </div>
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-brand-deep shadow-elev-1"
            style={{ left: `calc(${pct}% - 7px)` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-white/70 font-bold">
          <span>10</span>
          <span>18.5</span>
          <span>25</span>
          <span>30</span>
          <span>45</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 pt-1">
        <div className="rounded-control border border-brand-border bg-brand-surface/50 p-3 text-center">
          <p className="text-white font-bold text-sm">{cm} cm</p>
          <p className="text-white/70 text-[10px] mt-0.5">{ftStr}</p>
          <p className="text-white/70 text-[10px] font-bold uppercase mt-1">
            {t('rayhanah.heightLabel', 'Height')}
          </p>
        </div>
        <div className="rounded-control border border-brand-border bg-brand-surface/50 p-3 text-center">
          <p className="text-white font-bold text-sm">{kg} kg</p>
          <p className="text-white/70 text-[10px] mt-0.5">
            {Math.round(kg * 2.20462 * 10) / 10} lbs
          </p>
          <p className="text-white/70 text-[10px] font-bold uppercase mt-1">
            {t('rayhanah.weightLabel', 'Weight')}
          </p>
        </div>
        <div className="rounded-control border border-brand-border bg-brand-surface/50 p-3 text-center">
          <p className={`font-bold text-sm ${cat.color}`}>{bmi}</p>
          <p className="text-white/70 text-[10px] mt-0.5">
            {t('cycleAnalytics.bmiRange', '18.5–24.9 = Normal')}
          </p>
          <p className="text-white/70 text-[10px] font-bold uppercase mt-1">BMI</p>
        </div>
      </div>

      <p className="text-white/70 text-[10px] leading-relaxed">
        {t(
          'rayhanah.bmiNote',
          'BMI is a general guide, not a medical diagnosis. Your doctor knows your full picture.'
        )}
      </p>
      {summary?.pregnancy?.active && (
        <p className="text-brand-pink/60 text-[10px] leading-relaxed">
          {t(
            'rayhanah.bmiPregnancyNote',
            'BMI is not a reliable measure during pregnancy. Your midwife or doctor will guide you on healthy weight gain.'
          )}
        </p>
      )}
    </section>
  );
}
