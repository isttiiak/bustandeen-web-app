// The phone's clock is on another time zone than the saved prayer place
// (far-zone fix, 2026-10-12). Most often a traveller whose location is still
// home: every time on screen is then for home. Shown under the Home arch until
// the location is updated or this pair of zones is dismissed. Needs no
// location permission: it only compares the two clocks.
import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import {
  dismissZoneMismatch,
  placeShortName,
  readSavedPlace,
  zoneMismatch,
} from '../../utils/placeClock.js';
import { formatTime } from '../../utils/prayerTimes.js';

export default function ZoneMismatchCard({ now }: { now: Date }) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  const mismatch = dismissed ? null : zoneMismatch(now);
  if (!mismatch) return null;
  const place = placeShortName(readSavedPlace(), mismatch.zone);

  return (
    <div className="mb-4 rounded-card border border-brand-gold/30 bg-brand-gold/[0.08] px-4 py-3">
      <div className="flex items-start gap-3">
        <GlobeAltIcon className="w-6 h-6 shrink-0 text-brand-gold" aria-hidden />
        <div className="min-w-0">
          <p className="text-white/85 font-bold text-sm leading-tight">
            {t('home.zoneMismatchTitle', 'Your phone is on a different time zone')}
          </p>
          <p className="text-white/65 text-xs mt-1 leading-snug">
            {t(
              'home.zoneMismatchDesc',
              "Prayer times and today's date follow {{place}}, where it is {{time}} now. Travelling? Set your location to where you are.",
              { place, time: formatTime(now) }
            )}
          </p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            dismissZoneMismatch(mismatch.key);
            setDismissed(true);
          }}
          className="min-h-[44px] px-3 text-white/60 text-xs underline hover:text-white/80"
        >
          {t('home.zoneMismatchKeep', 'Keep {{place}}', { place })}
        </button>
        <Link
          to="/prayer-times?settings=1"
          className="min-h-[44px] inline-flex items-center px-4 rounded-control text-xs font-bold bg-brand-gold/20 border border-brand-gold/60 text-brand-gold hover:bg-brand-gold/30"
        >
          {t('home.zoneMismatchUpdate', 'Update location')}
        </Link>
      </div>
    </div>
  );
}
