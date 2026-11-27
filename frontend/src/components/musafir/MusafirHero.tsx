import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  BookOpenIcon,
  BriefcaseIcon,
  BuildingOfficeIcon,
  HomeIcon,
  LinkIcon,
  PencilSquareIcon,
  ScissorsIcon,
} from '@heroicons/react/24/outline';
import { BTN_PRIMARY, BTN_SECONDARY } from '../bustanStyles.js';
import { CrescentIcon, DuaHandsIcon, MosqueIcon } from '../icons/IslamicIcons.js';
import { translateSalatName } from '../../utils/prayerTimes.js';
import { formatLocaleNumber } from '../../utils/localeDate.js';
import { REF_SADAQAH } from '../../utils/musafir.js';
import { PILL } from './musafirShared.js';
import { RefQuote, JourneyRoad } from './MusafirBits.js';
import { type MusafirPage } from './useMusafirPage.js';

export default function MusafirHero({ page }: { page: MusafirPage }) {
  const { t } = useTranslation();
  const {
    active,
    musafir,
    day,
    meta,
    resident,
    bn,
    lang,
    openForm,
    setConfirmEnd,
    formOpen,
    fmtDate,
  } = page;

  return (
    <section className="rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-5 sm:px-7 pt-10 pb-6 text-center">
      <div className="w-16 h-16 mx-auto rounded-full grid place-items-center bg-brand-gold/10 border border-brand-gold/30">
        <BriefcaseIcon className="w-8 h-8 text-brand-gold" aria-hidden />
      </div>
      <p className="mt-3 text-xs font-bold uppercase tracking-widest text-brand-gold inline-flex items-center gap-2">
        {t('musafir.kicker', 'Musafir mode')}
        {active && (
          <span className="inline-flex items-center gap-1 normal-case tracking-normal font-semibold text-brand-emerald">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald" />
            {t('musafir.onBadge', 'on')}
          </span>
        )}
      </p>

      {active && musafir ? (
        <>
          <h2 className="font-display text-3xl font-bold text-white mt-1">
            {t('musafir.dayOfSafar', 'Day {{day}} of your safar', {
              day: formatLocaleNumber(day),
            })}
          </h2>
          <p className="text-white/75 text-sm mt-1">
            {musafir.destination
              ? t('musafir.toDestination', 'On the way to {{place}}', {
                  place: musafir.destination,
                })
              : t('musafir.onTheRoad', 'On the road')}
            <span className="text-white/60">
              {' · '}
              {musafir.startAfter
                ? t('musafir.sinceAfter', 'since {{date}}, after {{prayer}}', {
                    date: fmtDate(musafir.startedAt),
                    prayer: translateSalatName(musafir.startAfter, musafir.startAfter, t),
                  })
                : t('musafir.since', 'since {{date}}', {
                    date: fmtDate(musafir.startedAt),
                  })}{' '}
              <button
                onClick={openForm}
                className="underline underline-offset-2 text-white/70 hover:text-white"
              >
                {t('musafir.changeStart', 'change')}
              </button>
            </span>
          </p>
          <JourneyRoad />
          <div className="flex flex-wrap justify-center items-center gap-2 mt-3">
            <span className={PILL}>
              <BookOpenIcon className="w-3.5 h-3.5" aria-hidden />
              {bn ? meta.labelBn : meta.label}
            </span>
            {musafir.plannedStay ? (
              <span className={PILL}>
                <BuildingOfficeIcon className="w-3.5 h-3.5" aria-hidden />
                {t('musafir.stayChip', 'staying {{count}} days', {
                  count: musafir.plannedStay,
                })}
              </span>
            ) : null}
          </div>

          {/* Status: still a traveller, or a resident once you arrive */}
          <div
            className={`mt-4 rounded-control border p-3 text-xs sm:text-sm leading-relaxed text-left flex gap-2 ${
              resident
                ? 'border-brand-gold/40 bg-brand-gold/10 text-white/85'
                : 'border-brand-emerald/40 bg-brand-emerald/10 text-white/85'
            }`}
          >
            {resident ? (
              <BuildingOfficeIcon className="w-4 h-4 mt-0.5 shrink-0 text-brand-gold" aria-hidden />
            ) : (
              <ScissorsIcon className="w-4 h-4 mt-0.5 shrink-0 text-brand-emerald" aria-hidden />
            )}
            <span>
              {resident
                ? t(
                    'musafir.residentWarning',
                    'You plan to stay {{stay}} days. In the {{school}} view an intended stay of {{limit}}+ days makes you a resident: shorten on the road, then pray in full once you arrive.',
                    {
                      stay: musafir.plannedStay,
                      school: bn ? meta.labelBn : meta.label,
                      limit: meta.residentAfterDays,
                    }
                  )
                : t(
                    'musafir.qasrApplies',
                    'Qaṣr applies: pray Ẓuhr, ʿAṣr and ʿIshāʾ as 2 rak’ahs. Your salat tracker already knows.'
                  )}
            </span>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mt-4">
            <Link to="/salat" className={BTN_PRIMARY}>
              <MosqueIcon className="w-4 h-4" aria-hidden />
              {t('musafir.logPrayers', 'Log today’s prayers')}
            </Link>
            <button onClick={openForm} className={BTN_SECONDARY}>
              <PencilSquareIcon className="w-4 h-4" aria-hidden />
              {t('musafir.edit', 'Edit journey')}
            </button>
            <button
              onClick={() => setConfirmEnd(true)}
              className={`${BTN_SECONDARY} !text-brand-gold !border-brand-gold/40`}
            >
              <HomeIcon className="w-4 h-4" aria-hidden />
              {t('musafir.imHome', 'I’m home')}
            </button>
          </div>
        </>
      ) : (
        <>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1 leading-tight">
            {t('musafir.heroTitle', 'Travelling? Allah has made it easy for you.')}
          </h2>
          <div className="mt-3 rounded-control border border-brand-border bg-shade/20 p-3 text-left">
            <RefQuote r={REF_SADAQAH} lang={lang} />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4 text-left">
            {(
              [
                [ScissorsIcon, t('musafir.giftQasr', '4 rak’ahs become 2')],
                [LinkIcon, t('musafir.giftJam', 'Join prayers on the move')],
                [CrescentIcon, t('musafir.giftFast', 'Fasting may wait')],
                [DuaHandsIcon, t('musafir.giftDua', 'Your du‘ā is answered')],
              ] as const
            ).map(([Icon, label]) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-control border border-brand-border bg-brand-surface/60 px-3 py-2"
              >
                <Icon className="w-5 h-5 shrink-0 text-brand-gold" aria-hidden />
                <span className="text-white/85 text-xs font-semibold leading-tight">{label}</span>
              </div>
            ))}
          </div>
          {!formOpen && (
            <button onClick={openForm} className={`${BTN_PRIMARY} mt-5 w-full !py-3 !text-base`}>
              <BriefcaseIcon className="w-5 h-5" aria-hidden />
              {t('musafir.start', 'Start my journey')}
            </button>
          )}
        </>
      )}
    </section>
  );
}
