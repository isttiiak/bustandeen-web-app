import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { AiPanel, AiBadge, AiDisclaimer } from './AiFlair.js';
import { useKazaPlan } from '../../hooks/useNaseeh.js';
import { useAuthStore } from '../../store/useAuthStore.js';

/** Kaza payoff suggestion. Hidden when nothing is owed (nothing to plan). The
 * date is simple arithmetic on the owed count, never a ruling. */
export default function KazaPlanCard() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const aiEnabled = useAuthStore((s) => s.aiEnabled);
  const { data } = useKazaPlan();

  if (!user || !aiEnabled || !data || data.totalOwed <= 0) return null;

  const locale = i18n.language?.startsWith('bn') ? 'bn-BD' : 'en-GB';
  const fmtDate = (iso: string | null): string =>
    iso
      ? new Date(`${iso}T00:00:00Z`).toLocaleDateString(locale, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          timeZone: 'UTC',
        })
      : '';

  const [headline, ...rest] = data.lines;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <AiPanel>
        <div className="p-4 space-y-3">
          <AiBadge label={t('naseehKaza.badge', 'Naseeh · make-up prayer plan')} />

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3">
              <p className="text-white/40 text-[11px]">{t('naseehKaza.owed', 'Owed')}</p>
              <p className="text-white font-black text-2xl leading-tight">
                {data.totalOwed.toLocaleString(locale)}
              </p>
            </div>
            <div className="rounded-xl bg-brand-emerald/[0.08] border border-brand-emerald/20 p-3">
              <p className="text-white/40 text-[11px]">
                {t('naseehKaza.oneADay', 'One a day, done by')}
              </p>
              <p className="text-brand-emerald font-black text-base leading-tight mt-1">
                {fmtDate(data.clearedBy)}
              </p>
            </div>
          </div>

          {headline && <p className="text-white/80 text-sm leading-relaxed">{headline}</p>}
          {rest.map((line) => (
            <p key={line} className="text-white/60 text-sm leading-relaxed">
              {line}
            </p>
          ))}

          <p className="text-white/30 text-[11px] leading-relaxed">
            {t(
              'naseehKaza.basis',
              'A pace you can choose to follow, worked out from the count on your Salat page. It changes as you pay them back or add more.'
            )}
          </p>
          <AiDisclaimer />
        </div>
      </AiPanel>
    </motion.div>
  );
}
