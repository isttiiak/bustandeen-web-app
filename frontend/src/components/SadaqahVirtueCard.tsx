import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { translateReference } from '../utils/localeReference.js';
import type { SadaqahVirtueDay } from '../utils/sadaqahVirtueDays.js';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { DuaHandsIcon } from './icons/IslamicIcons.js';

/**
 * A persistent (not auto-dismissing) homepage card for days with
 * extra-recommended ṣadaqah virtue: Friday, Ramadan, the first 10 days of
 * Dhul Ḥijjah, Arafah, Laylat al-Qadr. Styled to match the other persistent
 * Friday cards on this page (hour-of-response, Surah al-Kahf), not the old
 * `SadaqahFridayReminder` banner it replaces, which auto-hid after 30s and
 * covered Friday only.
 */
export default function SadaqahVirtueCard({ day }: { day: SadaqahVirtueDay }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="mb-4">
      <button
        onClick={() => navigate('/sadaqah')}
        className="w-full text-left rounded-card border border-brand-gold/30 bg-brand-gold/[0.07] shadow-elev-1 p-4 hover:border-brand-gold/50 transition-colors"
      >
        <div className="flex items-start gap-3">
          <DuaHandsIcon className="w-6 h-6 shrink-0 text-brand-gold" />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-brand-gold font-semibold text-base">
              {t(`sadaqahVirtue.${day.id}.title`, day.title)}
            </h2>
            <p className="text-white/70 text-xs mt-1.5 leading-relaxed">
              {t(`sadaqahVirtue.${day.id}.desc`, day.desc)}
            </p>
            <p className="text-[11px] text-white/60 mt-2">
              {translateReference(day.reference.text, i18n.language)} ·{' '}
              {translateReference(day.reference.grade, i18n.language)}
            </p>
          </div>
          <ChevronRightIcon className="w-5 h-5 shrink-0 text-brand-gold" />
        </div>
      </button>
    </div>
  );
}
