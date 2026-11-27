import { type Dispatch, type SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpenIcon } from '@heroicons/react/24/outline';
import { TasbihIcon } from '../icons/IslamicIcons.js';
import { type PrayerId, type PrayerStatus, type SalatLog } from '../../hooks/useSalatLog.js';
import { LOCATION_TAGS, DisclosureLabel } from './salatParts.js';

/** The Details / Less toggle under a prayer, with a badge for what was marked. */
export default function SalatPrayerToggle({
  hasSubTag,
  status,
  isFuture,
  isExpanded,
  entry,
  prayerId,
  setExpandedPrayer,
}: {
  hasSubTag: boolean;
  status: PrayerStatus;
  isFuture: boolean;
  isExpanded: boolean;
  entry: SalatLog['prayers'][PrayerId] | undefined;
  prayerId: PrayerId;
  setExpandedPrayer: Dispatch<SetStateAction<PrayerId | null>>;
}) {
  const { t } = useTranslation();

  return (
    <>
      {/* Expand/collapse toggle for sub-tags (completed/kaza) or the
                        optional missed-reason picker */}
      {(hasSubTag || status === 'missed') && !isFuture && (
        <button
          onClick={() => setExpandedPrayer(isExpanded ? null : prayerId)}
          aria-expanded={isExpanded}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 border-t border-brand-border/50 text-white/50 hover:text-white text-xs transition-colors"
        >
          <DisclosureLabel open={isExpanded} />
          {status === 'completed' &&
            entry?.location &&
            entry.location !== 'home' &&
            (() => {
              const LocIcon = LOCATION_TAGS.find((loc) => loc.value === entry.location)?.Icon;
              return LocIcon ? <LocIcon className="w-3.5 h-3.5 text-brand-emerald" /> : null;
            })()}
          {entry?.tasbeeh && <TasbihIcon className="w-3.5 h-3.5 text-brand-info" />}
          {entry?.ayatulKursi && (
            <BookOpenIcon className="w-3.5 h-3.5 text-brand-gold" aria-hidden="true" />
          )}
          {entry?.missedReason && (
            <span className="text-red-400">
              {t(`salatTracker.missedReason.${entry.missedReason}`, entry.missedReason)}
            </span>
          )}
        </button>
      )}
    </>
  );
}
