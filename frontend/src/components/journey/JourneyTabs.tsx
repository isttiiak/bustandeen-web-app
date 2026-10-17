import { useTranslation } from 'react-i18next';
import { ChartBarIcon, MapIcon } from '@heroicons/react/24/outline';

export type AnalyticsView = 'stats' | 'journey';

/** Stats / Journey switch at the top of an analytics page. */
export default function JourneyTabs({
  view,
  onChange,
}: {
  view: AnalyticsView;
  onChange: (v: AnalyticsView) => void;
}) {
  const { t } = useTranslation();
  const items: [AnalyticsView, string, typeof ChartBarIcon][] = [
    ['stats', t('journey.tabStats'), ChartBarIcon],
    ['journey', t('journey.tabJourney'), MapIcon],
  ];
  return (
    <div
      className="grid grid-cols-2 gap-1 rounded-control border border-brand-border bg-brand-deep p-1"
      role="group"
      aria-label={t('journey.title')}
      data-testid="analytics-view"
    >
      {items.map(([v, label, Icon]) => (
        <button
          key={v}
          type="button"
          aria-pressed={view === v}
          onClick={() => onChange(v)}
          className={`min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-control text-sm font-bold transition-colors ${
            view === v ? 'bg-brand-emerald-dim text-on-color' : 'text-white/70 hover:text-white'
          }`}
        >
          <Icon className="w-4 h-4" aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}
