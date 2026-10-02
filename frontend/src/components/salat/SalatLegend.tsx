import { useTranslation, Trans } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import {
  BellSlashIcon,
  BookOpenIcon,
  Cog6ToothIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import { LeafIcon, MosqueIcon, Star8Icon, TasbihIcon } from '../icons/IslamicIcons.js';
import { DisclosureLabel } from './salatParts.js';

export interface SalatLegendProps {
  legendExpanded: boolean;
  setLegendExpanded: React.Dispatch<React.SetStateAction<boolean>>;
}

/** The highlighted words inside the help sentences. Passed by tag NUMBER
 * (`<1>`, `<3>`) rather than as positional children: with children, every
 * `{' '}` spacer shifted the indices and the highlighted words went missing
 * or doubled (found by the T2.4 render comparison). */
const EMPHASIS = <span className="text-white/90 font-medium" />;

/** One legend row: an SVG mark, the term, its meaning. */
function Row({
  icon,
  term,
  children,
}: {
  icon: React.ReactNode;
  term?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <p className="flex items-start gap-2">
      <span className="mt-px shrink-0">{icon}</span>
      <span>
        {term && <span className="text-white/90 font-medium">{term}: </span>}
        {children}
      </span>
    </p>
  );
}

const ICON = 'w-4 h-4';

export default function SalatLegend({ legendExpanded, setLegendExpanded }: SalatLegendProps) {
  const { t } = useTranslation();
  return (
    <>
      <div className="rounded-card border border-brand-border bg-brand-deep shadow-elev-1 overflow-hidden">
        <button
          onClick={() => setLegendExpanded((v) => !v)}
          aria-expanded={legendExpanded}
          className="w-full p-4 flex items-center justify-between gap-3 text-left"
        >
          <p className="text-white/60 text-xs font-semibold uppercase tracking-wide">
            {t('salatTracker.howItWorks', 'How it works')}
          </p>
          <span className="text-white/50 text-xs shrink-0">
            <DisclosureLabel open={legendExpanded} />
          </span>
        </button>
        <AnimatePresence>
          {legendExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-brand-border/70"
            >
              <div className="p-4 pt-3 space-y-1.5 text-xs text-white/70">
                <Row
                  icon={<LeafIcon className={`${ICON} text-brand-emerald fill-current`} />}
                  term={t('salatTracker.legendDone', 'Done')}
                >
                  {t('salatTracker.legendDoneDesc', 'prayed on time')}
                </Row>
                <Row
                  icon={<LeafIcon className={`${ICON} text-brand-gold fill-current`} />}
                  term={t('salatTracker.legendKaza', 'Kaza')}
                >
                  {t('salatTracker.legendKazaDesc', 'prayed late (still counts as prayed)')}
                </Row>
                <Row
                  icon={<LeafIcon className={`${ICON} text-red-400`} />}
                  term={t('salatTracker.legendMissed', 'Miss')}
                >
                  {t('salatTracker.legendMissedDesc', 'not prayed')}
                </Row>
                <Row
                  icon={<MosqueIcon className={`${ICON} text-brand-emerald`} />}
                  term={
                    <>
                      {t('salatTracker.legendMosque', 'Mosque')} {t('salatTracker.legendOr', 'or')}{' '}
                      {t('salatTracker.legendJamat', 'Jamat')}
                    </>
                  }
                >
                  {t('salatTracker.legendLocationDesc', 'tap Details after marking done')}
                </Row>
                <Row icon={<LockClosedIcon className={`${ICON} text-white/60`} />}>
                  {t(
                    'salatTracker.legendFutureLocked',
                    'Future prayers are locked until their time begins'
                  )}
                </Row>
                <Row
                  icon={<BookOpenIcon className={`${ICON} text-brand-gold`} />}
                  term={t('salatTracker.ayatulKursiWord', 'Ayatul Kursi')}
                >
                  {t(
                    'salatTracker.legendAyatulKursiDesc',
                    'toggle after marking Done/Kaza (tap Details)'
                  )}
                </Row>
                <Row
                  icon={<TasbihIcon className={`${ICON} text-brand-info`} />}
                  term={t('salatTracker.legendNafl', 'Nafl')}
                >
                  {t(
                    'salatTracker.legendNaflDesc',
                    "mark voluntary prayers and pick type + rak'ahs"
                  )}
                </Row>

                <div className="pt-2.5 mt-1 border-t border-brand-border/70 space-y-1.5">
                  <p className="text-brand-emerald font-semibold">
                    {t('salatTracker.countsItselfNow', 'Counts itself now')}
                  </p>
                  <Row icon={<TasbihIcon className={`${ICON} text-brand-info`} />}>
                    <Trans
                      i18nKey="salatTracker.legendTasbeehInfo"
                      defaults="Tapping <1>Tasbeeh</1> adds the full after-ṣalāh count to your dhikr automatically, so there is no more logging 33s by hand. Ayatul Kursi adds one. Un-tap to undo."
                      components={{ 1: EMPHASIS }}
                    />
                  </Row>
                  <Row icon={<BookOpenIcon className={`${ICON} text-brand-gold`} />}>
                    <Trans
                      i18nKey="salatTracker.legendAyatulKursiAutoInfo"
                      defaults="Tapping <1>Ayatul Kursi</1> (in Details) also auto-counts 1 recitation in your dhikr log, the same rule as Tasbeeh. Un-tap to undo."
                      components={{ 1: EMPHASIS }}
                    />
                  </Row>
                  <Row icon={<Cog6ToothIcon className={`${ICON} text-white/60`} />}>
                    <Trans
                      i18nKey="salatTracker.legendTasbihModeInfo"
                      defaults="Choose <1>33·33·33 + tahlīl</1> (Muslim 597a) or <3>33·33·34</3> (Muslim 596a) in salat settings. Both are authentic. Your ʿAṣr school lives there too."
                      components={{ 1: EMPHASIS, 3: EMPHASIS }}
                    />
                  </Row>
                  <Row icon={<BellSlashIcon className={`${ICON} text-white/60`} />}>
                    <Trans
                      i18nKey="salatTracker.legendAutoCountInfo"
                      defaults="Prefer to count by hand? Turn off <1>Auto-count dhikr</1> in salat settings. Tags still mark as done, and Tasbih mode on the Zikr counter becomes your manual way to count them."
                      components={{ 1: EMPHASIS }}
                    />
                  </Row>
                  <Row icon={<BookOpenIcon className={`${ICON} text-brand-emerald`} />}>
                    <Trans
                      i18nKey="salatTracker.legendReadNowInfo"
                      defaults="<1>Read now</1> under each prayer opens Ayatul Kursi and the three Quls straight in the reader (Abū Dāwūd 1523, ṣaḥīḥ)."
                      components={{ 1: EMPHASIS }}
                    />
                  </Row>
                  <Row icon={<Star8Icon className={`${ICON} text-brand-gold`} />}>
                    <Trans
                      i18nKey="salatTracker.legendFridayInfo"
                      defaults="On <1>Friday</1> you'll see Sūrat al-Kahf, and a live reminder for the hour of response between ʿAṣr and Maghrib (Abū Dāwūd 1048, ṣaḥīḥ)."
                      components={{ 1: EMPHASIS }}
                    />
                  </Row>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
