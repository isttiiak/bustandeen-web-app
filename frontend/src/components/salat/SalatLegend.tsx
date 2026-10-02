import { useTranslation, Trans } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';

export interface SalatLegendProps {
  legendExpanded: boolean;
  setLegendExpanded: React.Dispatch<React.SetStateAction<boolean>>;
}

/** The highlighted words inside the help sentences. Passed by tag NUMBER
 * (`<1>`, `<3>`) rather than as positional children: with children, every
 * `{' '}` spacer shifted the indices and the highlighted words went missing
 * or doubled (found by the T2.4 render comparison). */
const EMPHASIS = <span className="text-white/70 font-medium" />;

export default function SalatLegend({ legendExpanded, setLegendExpanded }: SalatLegendProps) {
  const { t } = useTranslation();
  return (
    <>
      <div className="card bg-brand-surface border border-brand-border rounded-2xl overflow-hidden">
        <button
          onClick={() => setLegendExpanded((v) => !v)}
          className="w-full card-body p-4 flex-row items-center justify-between gap-3 text-left"
        >
          <p className="text-white/30 text-xs font-semibold uppercase tracking-wide">
            {t('salatTracker.howItWorks', 'How it works')}
          </p>
          <span className="text-white/20 text-xs shrink-0">
            {legendExpanded
              ? t('salatTracker.less', '▲ Less')
              : t('salatTracker.details', '▾ Details')}
          </span>
        </button>
        <AnimatePresence>
          {legendExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-brand-emerald/10"
            >
              <div className="card-body p-4 pt-3 space-y-1.5 text-xs text-white/50">
                <p>
                  ✅{' '}
                  <span className="text-white/70 font-medium">
                    {t('salatTracker.legendDone', 'Done')}
                  </span>{' '}
                  — {t('salatTracker.legendDoneDesc', 'prayed on time')}
                </p>
                <p>
                  ⏰{' '}
                  <span className="text-white/70 font-medium">
                    {t('salatTracker.legendKaza', 'Kaza')}
                  </span>{' '}
                  — {t('salatTracker.legendKazaDesc', 'prayed late (still counts as prayed)')}
                </p>
                <p>
                  ❌{' '}
                  <span className="text-white/70 font-medium">
                    {t('salatTracker.legendMissed', 'Missed')}
                  </span>{' '}
                  — {t('salatTracker.legendMissedDesc', 'not prayed')}
                </p>
                <p>
                  🕌{' '}
                  <span className="text-white/70 font-medium">
                    {t('salatTracker.legendMosque', 'Mosque')}
                  </span>{' '}
                  {t('salatTracker.legendOr', 'or')} 👥{' '}
                  <span className="text-white/70 font-medium">
                    {t('salatTracker.legendJamat', 'Jamat')}
                  </span>{' '}
                  — {t('salatTracker.legendLocationDesc', 'tap ▾ Details after marking done')}
                </p>
                <p>
                  {t(
                    'salatTracker.legendFutureLocked',
                    '🔒 Future prayers are locked until their time begins'
                  )}
                </p>
                <p>
                  📖{' '}
                  <span className="text-white/70 font-medium">
                    {t('salatTracker.ayatulKursiWord', 'Ayatul Kursi')}
                  </span>{' '}
                  —{' '}
                  {t(
                    'salatTracker.legendAyatulKursiDesc',
                    'toggle after marking Done/Kaza (tap ▾ Details)'
                  )}
                </p>
                <p>
                  📿{' '}
                  <span className="text-white/70 font-medium">
                    {t('salatTracker.legendNafl', 'Nafl')}
                  </span>{' '}
                  —{' '}
                  {t(
                    'salatTracker.legendNaflDesc',
                    "mark voluntary prayers and pick type + rak'ahs"
                  )}
                </p>

                <div className="pt-2.5 mt-1 border-t border-brand-emerald/10 space-y-1.5">
                  <p className="text-brand-emerald/70 font-semibold">
                    {t('salatTracker.countsItselfNow', 'Counts itself now')}
                  </p>
                  <p>
                    <Trans
                      i18nKey="salatTracker.legendTasbeehInfo"
                      defaults="📿 Tapping <1>Tasbeeh</1> adds the full after-ṣalāh count to your dhikr automatically — no more logging 33s by hand. Ayatul Kursi adds one. Un-tap to undo."
                      components={{ 1: EMPHASIS }}
                    />
                  </p>
                  <p>
                    <Trans
                      i18nKey="salatTracker.legendAyatulKursiAutoInfo"
                      defaults="📖 Tapping <1>Ayatul Kursi</1> (in ▾ Details) also auto-counts 1 recitation in your dhikr log — the same rule as Tasbeeh. Un-tap to undo."
                      components={{ 1: EMPHASIS }}
                    />
                  </p>
                  <p>
                    <Trans
                      i18nKey="salatTracker.legendTasbihModeInfo"
                      defaults="⚙️ Choose <1>33·33·33 + tahlīl</1> (Muslim 597a) or <3>33·33·34</3> (Muslim 596a) in salat settings — both are authentic. Your ʿAṣr school lives there too."
                      components={{ 1: EMPHASIS, 3: EMPHASIS }}
                    />
                  </p>
                  <p>
                    <Trans
                      i18nKey="salatTracker.legendAutoCountInfo"
                      defaults="🔕 Prefer to count by hand? Turn off <1>Auto-count dhikr</1> in salat settings — tags still mark as done, and Tasbih mode on the Zikr counter becomes your manual way to count them."
                      components={{ 1: EMPHASIS }}
                    />
                  </p>
                  <p>
                    <Trans
                      i18nKey="salatTracker.legendReadNowInfo"
                      defaults="📖 <1>Read now</1> under each prayer opens Ayatul Kursi and the three Quls straight in the reader (Abū Dāwūd 1523, ṣaḥīḥ)."
                      components={{ 1: EMPHASIS }}
                    />
                  </p>
                  <p>
                    <Trans
                      i18nKey="salatTracker.legendFridayInfo"
                      defaults="🌟 On <1>Friday</1> you'll see Sūrat al-Kahf, and a live reminder for the hour of response between ʿAṣr and Maghrib (Abū Dāwūd 1048, ṣaḥīḥ)."
                      components={{ 1: EMPHASIS }}
                    />
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
