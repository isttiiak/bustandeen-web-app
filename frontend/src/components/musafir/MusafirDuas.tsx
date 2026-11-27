import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import {
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
  CheckIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { CARD, SECTION_TITLE } from '../bustanStyles.js';
import { DuaHandsIcon } from '../icons/IslamicIcons.js';
import { DuaIcon } from './musafirIcons.js';
import { translateReference } from '../../utils/localeReference.js';
import { formatLocaleNumber } from '../../utils/localeDate.js';
import { MUSAFIR_DUAS } from '../../utils/musafir.js';
import { type MusafirPage } from './useMusafirPage.js';

export default function MusafirDuas({ page }: { page: MusafirPage }) {
  const { t } = useTranslation();
  const { said, saidCount, openDua, setOpenDua, toggleSaid, bn, lang } = page;

  return (
    <section className={`${CARD} p-4 sm:p-5`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className={SECTION_TITLE}>
          <DuaHandsIcon className="w-5 h-5 text-brand-gold" aria-hidden />
          {t('musafir.duasTitle', 'Du‘ās of the journey')}
        </h3>
        <span className="text-brand-emerald text-xs font-bold tabular-nums">
          {formatLocaleNumber(saidCount)}/{formatLocaleNumber(MUSAFIR_DUAS.length)}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-brand-surface mt-2 overflow-hidden">
        <div
          className="h-full rounded-full bg-brand-emerald transition-[width] duration-500"
          style={{ width: `${(saidCount / MUSAFIR_DUAS.length) * 100}%` }}
        />
      </div>
      <p className="text-white/65 text-[11px] mt-1.5">
        {saidCount === MUSAFIR_DUAS.length
          ? t('musafir.duasAllDone', 'MashaAllah, every travel sunnah du‘ā today!')
          : t('musafir.duasHint', 'Tap the circle once you’ve said it. Resets each day.')}
      </p>
      <ul className="mt-3 space-y-2">
        {MUSAFIR_DUAS.map((d) => {
          const done = said.includes(d.id);
          const open = openDua === d.id;
          return (
            <li
              key={d.id}
              className={`rounded-control border transition-colors ${
                done
                  ? 'border-brand-emerald/50 bg-brand-emerald/10'
                  : 'border-brand-border bg-brand-surface/50'
              }`}
            >
              <div className="flex items-center gap-3 p-3">
                <button
                  onClick={() => toggleSaid(d.id)}
                  aria-pressed={done}
                  aria-label={t('musafir.markSaid', 'Mark as said')}
                  className={`shrink-0 w-8 h-8 rounded-full border-2 grid place-items-center transition-colors active:scale-90 ${
                    done
                      ? 'bg-brand-emerald-dim border-brand-emerald-dim text-on-color'
                      : 'border-brand-border text-transparent hover:border-brand-emerald'
                  }`}
                >
                  <CheckIcon className="w-4 h-4" strokeWidth={3} aria-hidden />
                </button>
                <button
                  onClick={() => setOpenDua(open ? null : d.id)}
                  aria-expanded={open}
                  className="flex-1 min-w-0 text-left flex items-center gap-2"
                >
                  <DuaIcon id={d.id} className="w-5 h-5 shrink-0 text-brand-gold" />
                  <span className="min-w-0">
                    <span
                      className={`block text-sm font-bold leading-tight ${done ? 'text-brand-emerald' : 'text-white/90'}`}
                    >
                      {bn ? d.whenBn : d.when}
                    </span>
                    {d.returning && (
                      <span className="text-brand-gold text-[10px] font-bold uppercase tracking-wide">
                        {t('musafir.onReturn', 'on return')}
                      </span>
                    )}
                  </span>
                  <ChevronDownIcon
                    className={`ml-auto w-4 h-4 shrink-0 text-white/60 transition-transform ${open ? 'rotate-180' : ''}`}
                    aria-hidden
                  />
                </button>
              </div>
              <AnimatePresence>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-2">
                      <p
                        dir="rtl"
                        lang="ar"
                        className="text-white text-xl leading-loose font-arabic text-right"
                      >
                        {d.arabic}
                      </p>
                      <p className="text-brand-gold text-xs italic leading-relaxed">{d.translit}</p>
                      <p className="text-white/75 text-xs leading-relaxed">
                        {bn ? d.meaningBn : d.meaning}
                      </p>
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-brand-gold underline underline-offset-2"
                      >
                        <BookOpenIcon className="w-3.5 h-3.5 shrink-0" aria-hidden />
                        {translateReference(d.source, lang)} · {translateReference(d.grade, lang)}
                        <ArrowTopRightOnSquareIcon className="w-3 h-3 shrink-0" aria-hidden />
                      </a>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
