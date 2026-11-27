import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { BriefcaseIcon } from '@heroicons/react/24/outline';
import { FlowerIcon, IshaIcon } from '../icons/IslamicIcons.js';
import { type PrayerId } from '../../hooks/useSalatLog.js';
import { type CycleActive } from '../../hooks/useCycle.js';
import { getShowSunnahGuide, getShowNaflGuide } from '../../utils/salatPrefs.js';
import { SUNNAH_GUIDE, JUMUAH_SUNNAH_GUIDE, type SunnahSlot } from '../../utils/sunnahGuide.js';
import { translateReference } from '../../utils/localeReference.js';
import { SunnahGuidanceRow, RefIcon } from './salatParts.js';

/** The travel sunnah note, the sunnah guidance, the Witr reminder and the istiḥāḍa reminder. */
export default function SalatCardGuidance({
  prayerId,
  isToday,
  isCurrent,
  isFuture,
  isJumuah,
  rowTravel,
  cycleActive,
}: {
  prayerId: PrayerId;
  isToday: boolean;
  isCurrent: boolean;
  isFuture: boolean;
  isJumuah: boolean;
  rowTravel: boolean;
  cycleActive: CycleActive | null;
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  return (
    <>
      {/* Musafir: the regular sunnah may be left on a journey
                            (Ibn ʿUmar, Muslim 689a) — Fajr's two are kept, so
                            Fajr falls through to its normal guidance below. */}
      {isCurrent && rowTravel && prayerId !== 'fajr' && (
        <div className="px-3 py-2.5 border-t border-brand-info/20 flex items-start gap-2 bg-brand-info/5">
          <BriefcaseIcon className="w-4 h-4 mt-px shrink-0 text-brand-info" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-brand-info font-bold text-xs leading-tight">
              {t('salatTracker.travelSunnahTitle', 'On a journey, the sunnah is light')}
            </p>
            <p className="text-white/60 text-xs leading-relaxed mt-0.5">
              {t(
                'salatTracker.travelSunnahDesc',
                "The Prophet ﷺ left the regular sunnah of Ẓuhr, Maghrib and ʿIshāʾ on journeys; he kept Fajr's two and Witr. Any nafl is still yours to pray."
              )}
            </p>
            <a
              href="https://sunnah.com/muslim:689a"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-brand-info/80 text-xs underline hover:text-brand-info transition-colors mt-0.5 inline-block"
            >
              <RefIcon />
              {translateReference('Ṣaḥīḥ Muslim 689a', i18n.language)}
            </a>
          </div>
        </div>
      )}

      {isCurrent &&
        !(rowTravel && prayerId !== 'fajr') &&
        (() => {
          // Friday's Dhuhr slot IS Jumu'ah — its sunnah
          // guidance is genuinely different, not a fallback
          // to Dhuhr's own rawātib (see sunnahGuide.ts).
          const guide = isJumuah ? JUMUAH_SUNNAH_GUIDE : SUNNAH_GUIDE[prayerId];
          if (!guide) return null;
          const showMuakkadah = getShowSunnahGuide();
          const showNafl = getShowNaflGuide();
          const slots: Array<{ slot: SunnahSlot; position: 'before' | 'after' }> = [];
          if (guide.before) slots.push({ slot: guide.before, position: 'before' });
          if (guide.after) slots.push({ slot: guide.after, position: 'after' });
          return slots.map(({ slot, position }) => {
            const visible = slot.emphasis === 'muakkadah' ? showMuakkadah : showNafl;
            if (!visible) return null;
            return (
              <SunnahGuidanceRow
                key={`${prayerId}-${position}`}
                slot={slot}
                position={position}
                lang={i18n.language}
              />
            );
          });
        })()}

      {/* Witr reminder — only once Isha has actually started (not
                            while it's still upcoming today) */}
      {prayerId === 'isha' && !isFuture && (
        <div className="px-3 py-2.5 border-t border-brand-gold/20 flex items-start gap-2 bg-brand-gold/5">
          <IshaIcon className="w-4 h-4 mt-px shrink-0 text-brand-gold" />
          <div className="min-w-0">
            <p className="text-brand-gold font-bold text-xs leading-tight">
              {t('salatTracker.witrReminderTitle', "Don't forget Witr, it's wājib!")}
            </p>
            <p className="text-white/60 text-xs leading-relaxed mt-0.5">
              {t(
                'salatTracker.witrReminderDesc',
                "Pray Witr after Isha before Fajr, usually 3 rak'ahs with Qunūt du'ā. The Prophet ﷺ never abandoned it, even while travelling."
              )}
            </p>
            <a
              href="https://sunnah.com/bukhari:998"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-brand-gold/80 text-xs underline hover:text-brand-gold transition-colors mt-0.5 inline-block"
            >
              <RefIcon />
              {translateReference('Ṣaḥīḥ al-Bukhārī 998', i18n.language)}
            </a>
          </div>
        </div>
      )}

      {/* Istihadha wudu-renewal reminder — only for TODAY's
                        prayers, and only while her logged cycle is actively
                        flagged beyond the madhab's hayd/nifas maximum. */}
      {isToday && !isFuture && cycleActive?.beyondMax && (
        <div className="px-3 py-2.5 border-t border-brand-pink/20 flex items-start gap-2 bg-brand-pink/5">
          <FlowerIcon className="w-4 h-4 mt-px shrink-0 text-brand-pink" />
          <div className="min-w-0">
            <p className="text-brand-pink font-bold text-xs leading-tight">
              {t('salatTracker.istihadaReminderTitle', 'Fresh wuḍū for this prayer')}
            </p>
            <p className="text-white/60 text-xs leading-relaxed mt-0.5">
              {t(
                'salatTracker.istihadaReminderDesc',
                "You're in istiḥāḍa. Perform wuḍū again right before this prayer, then pray as usual."
              )}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate('/cycle');
              }}
              className="text-brand-pink/80 text-xs underline hover:text-brand-pink transition-colors mt-0.5 inline-block"
            >
              {t('salatTracker.istihadaReminderLink', 'Learn more in Rayhanah')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
