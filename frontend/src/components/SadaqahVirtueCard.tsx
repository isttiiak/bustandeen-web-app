import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { translateReference } from '../utils/localeReference.js';
import type { SadaqahVirtueDay } from '../utils/sadaqahVirtueDays.js';

/**
 * A persistent (not auto-dismissing) homepage card for days with
 * extra-recommended ṣadaqah virtue — Friday, Ramadan, the first 10 days of
 * Dhul Ḥijjah, Arafah, Laylat al-Qadr. Styled to match the other persistent
 * Friday cards on this page (hour-of-response, Surah al-Kahf), not the old
 * `SadaqahFridayReminder` banner it replaces, which auto-hid after 30s and
 * covered Friday only.
 */
export default function SadaqahVirtueCard({ day }: { day: SadaqahVirtueDay }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
      <button
        onClick={() => navigate('/sadaqah')}
        className="w-full text-left rounded-2xl border border-brand-gold/30 bg-gradient-to-br from-brand-gold/10 to-brand-emerald/5 p-4 hover:border-brand-gold/50 transition-colors"
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0">{day.icon}</span>
          <div className="min-w-0 flex-1">
            <h3 className="text-brand-gold font-black text-sm">
              {t(`sadaqahVirtue.${day.id}.title`, day.title)}
            </h3>
            <p className="text-white/60 text-xs mt-1.5 leading-relaxed">
              {t(`sadaqahVirtue.${day.id}.desc`, day.desc)}
            </p>
            <p className="text-[11px] text-white/35 mt-2">
              {translateReference(day.reference.text, i18n.language)} ·{' '}
              {translateReference(day.reference.grade, i18n.language)}
            </p>
          </div>
          <span className="text-brand-gold/60 text-lg shrink-0">→</span>
        </div>
      </button>
    </motion.div>
  );
}
