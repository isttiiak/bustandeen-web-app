import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { BellIcon } from '@heroicons/react/24/outline';
import { FlowerIcon, LeafIcon } from '../icons/IslamicIcons.js';
import type { HomeState } from './useHomeData.js';

/** The pre-period heads-up and the Rayhanah days banner (the wording softens in discreet mode). */
export function HomeCycleBanners({
  upcomingCycleDays,
  discreetMode,
  cycleActive,
}: Pick<HomeState, 'upcomingCycleDays' | 'discreetMode' | 'cycleActive'>) {
  const { t } = useTranslation();
  return (
    <>
      {/* Pre-period heads-up: predicted start within 3 days */}
      {upcomingCycleDays !== null && (
        <Link to="/cycle" className="block mb-4">
          <div
            className={`flex items-center gap-3 rounded-card border px-4 py-3 shadow-elev-1 transition-colors ${
              discreetMode
                ? 'border-brand-border bg-brand-deep hover:border-white/20'
                : 'border-brand-pink/25 bg-brand-pink/10 hover:border-brand-pink/40'
            }`}
          >
            {discreetMode ? (
              <BellIcon className="w-6 h-6 shrink-0 text-white/60" />
            ) : (
              <FlowerIcon className="w-6 h-6 shrink-0 text-brand-pink" />
            )}
            <div className="min-w-0">
              <p
                className={`font-bold text-sm ${discreetMode ? 'text-white/80' : 'text-brand-pink'}`}
              >
                {discreetMode
                  ? t('home.discreetPrePeriod', 'Something to check')
                  : upcomingCycleDays === 0
                    ? t('home.periodMayBegin')
                    : upcomingCycleDays! > 1
                      ? t('home.periodMayBeginInPlural', { days: upcomingCycleDays })
                      : t('home.periodMayBeginIn', { days: upcomingCycleDays })}
              </p>
              <p className="text-white/50 text-xs mt-0.5">
                {discreetMode
                  ? t('home.discreetOpenWellness', 'Open Wellness')
                  : t('home.openRayhanah')}
              </p>
            </div>
          </div>
        </Link>
      )}

      {/* Rayhanah days banner: female users with an active cycle */}
      {cycleActive && (
        <Link to="/cycle" className="block mb-4">
          <div
            className={`flex items-center gap-3 rounded-card border px-4 py-3.5 shadow-elev-1 transition-colors ${
              discreetMode
                ? 'border-brand-border bg-brand-deep hover:border-white/20'
                : 'border-brand-pink/25 bg-brand-pink/10 hover:border-brand-pink/40'
            }`}
          >
            {discreetMode ? (
              <LeafIcon className="w-6 h-6 shrink-0 text-brand-emerald" />
            ) : (
              <FlowerIcon className="w-6 h-6 shrink-0 text-brand-pink" />
            )}
            <div className="min-w-0">
              <p
                className={`font-bold text-sm ${discreetMode ? 'text-white/80' : 'text-brand-pink'}`}
              >
                {discreetMode
                  ? t('home.discreetActiveDay', 'Wellness mode, day {{day, number}}', {
                      day: cycleActive.dayCount,
                    })
                  : t('home.rayhanahDay', { day: cycleActive.dayCount })}
              </p>
              <p className="text-white/50 text-xs mt-1">
                {discreetMode
                  ? t('home.discreetActiveDetail', 'Some trackers are paused today.')
                  : t('home.rayhanahDetail')}
              </p>
            </div>
          </div>
        </Link>
      )}
    </>
  );
}
