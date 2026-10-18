import AreaOverview from './AreaOverview.js';
import ResetTracker from './ResetTracker.js';
import type { StatsArea, TrackedArea } from '../../hooks/useStatsResets.js';

/** An analytics page's Journey tab: the area's overview card and its resets. */
export default function AreaJourney({
  area,
  trackers = [area],
}: {
  area: StatsArea;
  /** Salat lists its own resets and the Kaza debt's. */
  trackers?: readonly TrackedArea[];
}) {
  return (
    <div className="space-y-4" data-testid="area-journey">
      <AreaOverview area={area} />
      <ResetTracker areas={trackers} />
    </div>
  );
}
