import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import {
  BookOpenIcon,
  BriefcaseIcon,
  BuildingOfficeIcon,
  CalendarDaysIcon,
  MapIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, SECTION_TITLE } from '../bustanStyles.js';
import { MosqueIcon } from '../icons/IslamicIcons.js';
import { translateSalatName } from '../../utils/prayerTimes.js';
import { SCHOOLS } from '../../utils/musafir.js';
import { STAY_PRESETS, FIELD, LABEL, chip } from './musafirShared.js';
import { type MusafirPage } from './useMusafirPage.js';

export default function MusafirForm({ page }: { page: MusafirPage }) {
  const { t } = useTranslation();
  const {
    formOpen,
    setFormOpen,
    active,
    today,
    minStartDate,
    startDate,
    setStartDate,
    startAfter,
    setStartAfter,
    destination,
    setDestination,
    plannedStay,
    setPlannedStay,
    school,
    setSchool,
    submitForm,
    bn,
  } = page;

  return (
    <AnimatePresence>
      {formOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className={`${CARD} p-5 space-y-5`}>
            <h3 className={SECTION_TITLE}>
              <MapIcon className="w-5 h-5 text-brand-gold" aria-hidden />
              {active
                ? t('musafir.editTitle', 'Your journey')
                : t('musafir.setupTitle', 'Where are you heading?')}
            </h3>

            <div>
              <label className="block">
                <span className={LABEL}>
                  <CalendarDaysIcon className="w-4 h-4 text-brand-gold" aria-hidden />
                  {t('musafir.startDateLabel', 'When did you set out?')}
                </span>
                <input
                  type="date"
                  value={startDate}
                  max={today}
                  min={minStartDate}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v && v <= today && v >= minStartDate) setStartDate(v);
                  }}
                  className={FIELD}
                />
              </label>
              <p className={`${LABEL} mt-3`}>
                <MosqueIcon className="w-4 h-4 text-brand-gold" aria-hidden />
                {t('musafir.startAfterLabel', 'Last prayer you prayed at home that day')}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {([undefined, 'fajr', 'dhuhr', 'asr', 'maghrib'] as const).map((p) => (
                  <button
                    key={p ?? 'none'}
                    onClick={() => setStartAfter(p)}
                    aria-pressed={startAfter === p}
                    className={chip(startAfter === p)}
                  >
                    {p
                      ? translateSalatName(p, p, t)
                      : t('musafir.startAfterNone', 'None, left before Fajr')}
                  </button>
                ))}
              </div>
              <p className="text-white/65 text-[11px] mt-1.5 leading-relaxed">
                {startAfter
                  ? t(
                      'musafir.startAfterHint',
                      'Shortening starts with the prayer after {{prayer}} on that day. Left after ʿIshāʾ? Pick the next day and “None”.',
                      { prayer: translateSalatName(startAfter, startAfter, t) }
                    )
                  : t(
                      'musafir.startAfterHintNone',
                      'Every prayer of that day counts as a travel prayer. Left after ʿIshāʾ? Pick the next day.'
                    )}
              </p>
            </div>

            <label className="block">
              <span className={LABEL}>
                <MapPinIcon className="w-4 h-4 text-brand-gold" aria-hidden />
                {t('musafir.destinationLabel', 'Destination (optional)')}
              </span>
              <input
                value={destination}
                maxLength={60}
                onChange={(e) => setDestination(e.target.value)}
                placeholder={t(
                  'musafir.destinationPlaceholder',
                  'e.g. Makkah, Sylhet, grandma’s village'
                )}
                className={FIELD}
              />
            </label>

            <div>
              <span className={LABEL}>
                <BuildingOfficeIcon className="w-4 h-4 text-brand-gold" aria-hidden />
                {t('musafir.stayLabel', 'How many days will you stay there?')}
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {STAY_PRESETS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setPlannedStay(d)}
                    aria-pressed={plannedStay === d}
                    className={chip(plannedStay === d)}
                  >
                    {d === 0
                      ? t('musafir.stayUnsure', 'Not sure / moving on')
                      : t('musafir.stayDays', '{{count}} days', { count: d })}
                  </button>
                ))}
              </div>
              <p className="text-white/65 text-[11px] mt-1.5 leading-relaxed">
                {t(
                  'musafir.stayHint',
                  'Used only to tell you whether you become a resident on arrival (4+ days majority, 15+ Ḥanafī).'
                )}
              </p>
            </div>

            <div>
              <span className={LABEL}>
                <BookOpenIcon className="w-4 h-4 text-brand-gold" aria-hidden />
                {t('musafir.schoolLabel', 'Which view do you follow?')}
              </span>
              <div className="grid sm:grid-cols-2 gap-2 mt-1.5">
                {SCHOOLS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSchool(s.id)}
                    aria-pressed={school === s.id}
                    className={`text-left rounded-control border p-3 transition-colors ${
                      school === s.id
                        ? 'bg-brand-emerald/15 border-brand-emerald'
                        : 'bg-brand-surface/50 border-brand-border hover:border-brand-gold/40'
                    }`}
                  >
                    <p
                      className={`text-sm font-bold ${school === s.id ? 'text-brand-emerald' : 'text-white/85'}`}
                    >
                      {bn ? s.labelBn : s.label}
                    </p>
                    <p className="text-white/65 text-[11px] mt-0.5">{bn ? s.whoBn : s.who}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={submitForm} className={`${BTN_PRIMARY} flex-1 !py-3`}>
                {!active && <BriefcaseIcon className="w-4 h-4" aria-hidden />}
                {active ? t('musafir.save', 'Save') : t('musafir.bismillah', 'Bismillah, let’s go')}
              </button>
              <button onClick={() => setFormOpen(false)} className={BTN_SECONDARY}>
                {t('musafir.cancel', 'Cancel')}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
