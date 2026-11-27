import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { CheckIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { FlowerIcon, LeafIcon } from '../icons/IslamicIcons.js';
import { GARDEN_ICON } from './cycleIcons.js';
import { CARD, SECTION_TITLE } from '../bustanStyles.js';
import { GARDEN_ITEMS, NOTE } from './rayhanahShared.js';
import { Ref } from './RayhanahBits.js';

export default function RayhanahGarden({
  garden,
  gardenDone,
  toggleGarden,
}: {
  garden: Record<string, boolean>;
  gardenDone: number;
  toggleGarden: (id: string) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <section className={`${CARD} p-5`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className={SECTION_TITLE}>
          <FlowerIcon className="w-5 h-5 text-brand-pink" />
          {t('rayhanah.gardenOfLight', 'Garden of Light')}
        </h2>
        <span className="text-xs font-bold text-brand-pink tabular-nums">
          {t('rayhanah.gardenProgress', '{{done, number}}/{{total, number}} today', {
            done: gardenDone,
            total: GARDEN_ITEMS.length,
          })}
        </span>
      </div>
      <p className={`${NOTE} mt-1`}>
        {t(
          'rayhanah.gardenIntro',
          'Everything here remains fully open to you. The Prophet ﷺ remembered Allah in all states'
        )}{' '}
        (<Ref href="https://sunnah.com/muslim:373" label="Muslim 373" />
        ).
      </p>
      <div className="mt-3 space-y-1.5">
        {GARDEN_ITEMS.map((g) => {
          const gLabel = t(`rayhanah.garden.${g.id}`, g.label);
          const GIcon = GARDEN_ICON[g.id] ?? LeafIcon;
          const done = !!garden[g.id];
          return (
            <div
              key={g.id}
              className="flex items-center gap-3 rounded-control border border-brand-border bg-brand-surface/50 px-3 py-2.5"
            >
              <button
                aria-label={t('rayhanah.markItem', 'Mark {{label}}', { label: gLabel })}
                aria-pressed={done}
                onClick={() => toggleGarden(g.id)}
                className={`w-7 h-7 rounded-full grid place-items-center border transition-colors flex-shrink-0 ${done ? 'bg-brand-emerald-dim border-brand-emerald-dim text-on-color' : 'border-brand-border text-transparent hover:border-brand-pink/60'}`}
              >
                <CheckIcon className="w-4 h-4" />
              </button>
              <GIcon className="w-4 h-4 shrink-0 text-brand-pink" aria-hidden="true" />
              <span
                className={`text-sm flex-1 ${done ? 'text-white/60 line-through' : 'text-white/85'}`}
              >
                {gLabel}
              </span>
              {g.link && (
                <button
                  className="inline-flex items-center gap-0.5 text-xs font-bold text-brand-gold hover:underline"
                  onClick={() => navigate(g.link!)}
                >
                  {t('rayhanah.openArrow', 'Open')}
                  <ChevronRightIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {gardenDone === GARDEN_ITEMS.length && (
        <p className="text-center text-brand-pink text-sm font-bold mt-3">
          {t('rayhanah.gardenComplete', 'Mā shāʾ Allāh, a full garden today!')}
        </p>
      )}
    </section>
  );
}
