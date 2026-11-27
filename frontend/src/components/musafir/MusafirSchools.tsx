import { useTranslation } from 'react-i18next';
import { BookOpenIcon, BuildingOfficeIcon, LinkIcon, MapIcon } from '@heroicons/react/24/outline';
import { CARD, SECTION_TITLE } from '../bustanStyles.js';
import { SCHOOLS } from '../../utils/musafir.js';
import { type MusafirPage } from './useMusafirPage.js';

export default function MusafirSchools({ page }: { page: MusafirPage }) {
  const { t } = useTranslation();
  const { musafir, school, bn } = page;

  return (
    <section className={`${CARD} p-4 sm:p-5`}>
      <h3 className={SECTION_TITLE}>
        <BookOpenIcon className="w-5 h-5 text-brand-gold" aria-hidden />
        {t('musafir.schoolsTitle', 'Where the madhabs differ')}
      </h3>
      <p className="text-white/70 text-xs mt-0.5">
        {t('musafir.schoolsSub', 'Both are valid scholarly positions. Your choice is highlighted.')}
      </p>
      <div className="mt-3 space-y-3">
        {(
          [
            [MapIcon, t('musafir.rowDistance', 'Minimum distance'), 'distance'],
            [BuildingOfficeIcon, t('musafir.rowStay', 'Staying at one place'), 'stay'],
            [LinkIcon, t('musafir.rowJam', 'Joining prayers'), 'jam'],
          ] as const
        ).map(([Icon, label, key]) => (
          <div key={key}>
            <p className="text-white/75 text-[11px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Icon className="w-4 h-4 text-brand-gold" aria-hidden />
              {label}
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {SCHOOLS.map((s) => {
                const mine = s.id === (musafir?.school ?? school);
                const text = bn
                  ? key === 'distance'
                    ? s.distanceBn
                    : key === 'stay'
                      ? s.stayBn
                      : s.jamBn
                  : s[key];
                return (
                  <div
                    key={s.id}
                    className={`rounded-control border p-2.5 ${
                      mine
                        ? 'border-brand-emerald/60 bg-brand-emerald/10'
                        : 'border-brand-border bg-shade/20'
                    }`}
                  >
                    <p
                      className={`text-[10px] font-bold uppercase ${mine ? 'text-brand-emerald' : 'text-white/60'}`}
                    >
                      {bn ? s.labelBn : s.label}
                    </p>
                    <p className="text-white/80 text-xs mt-0.5 leading-relaxed">{text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
