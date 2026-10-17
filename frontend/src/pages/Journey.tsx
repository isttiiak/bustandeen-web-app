import { useTranslation } from 'react-i18next';
import { MapIcon } from '@heroicons/react/24/outline';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
import { LibraryHero } from '../components/library/libraryParts.js';
import AreaOverview from '../components/journey/AreaOverview.js';
import ResetTracker from '../components/journey/ResetTracker.js';
import { STATS_AREAS, TRACKED_AREAS } from '../hooks/useStatsResets.js';

/**
 * Journey (menu, under Settings): one overview card per area since its last
 * fresh start, then the reset tracker (every area, the Kaza debt and the uses
 * of "Reset all stats", with dates). Each analytics page has the same for its
 * own area in its Journey tab.
 */
export default function Journey() {
  const { t } = useTranslation();
  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('journey.title')}
        description={t('journey.sub')}
        path="/journey"
        index={false}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto space-y-4 pb-10">
          <LibraryHero Icon={MapIcon} title={t('journey.title')} subtitle={t('journey.sub')} />
          <h2 className="sr-only">{t('journey.overviewTitle')}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {STATS_AREAS.map((a) => (
              <AreaOverview key={a} area={a} linked />
            ))}
          </div>
          <ResetTracker areas={TRACKED_AREAS} withAll />
        </div>
      </div>
    </AnimatedBackground>
  );
}
