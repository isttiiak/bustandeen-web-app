import toast from 'react-hot-toast';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { BriefcaseIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import i18n from '../../i18n.js';
import {
  defaultSchool,
  endMusafir,
  journeyDay,
  schoolMeta,
  startMusafir,
  suggestStartAfter,
  useMusafir,
} from '../../utils/musafir.js';
import { formatLocaleDate } from '../../utils/localeDate.js';
import { translateSalatName } from '../../utils/prayerTimes.js';
import { getTrackingDay } from '../../utils/trackingDay.js';
import { SectionCard, Toggle } from './settingsParts.js';

export function SettingsMusafirSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const musafir = useMusafir();
  return (
    <SectionCard
      icon={<BriefcaseIcon className="w-5 h-5 text-brand-info" />}
      title={t('settings.musafirSection')}
      subtitle={t('settings.musafirSubtitle')}
      delay={0.04}
    >
      <Toggle
        checked={!!musafir}
        onChange={(on) => {
          const today = getTrackingDay();
          if (on) {
            startMusafir({
              today,
              startAfter: suggestStartAfter(today),
              school: defaultSchool(),
            });
            toast.success(t('settings.musafirStarted'));
          } else {
            endMusafir(today);
            toast.success(t('settings.musafirEnded'));
          }
        }}
        title={musafir ? t('settings.musafirOnTitle') : t('settings.musafirOffTitle')}
        detail={
          musafir
            ? t('settings.musafirOnDetail', {
                day: journeyDay(musafir, getTrackingDay()),
                school:
                  i18n.resolvedLanguage === 'bn'
                    ? schoolMeta(musafir.school).labelBn
                    : schoolMeta(musafir.school).label,
              })
            : t('settings.musafirOffDetail')
        }
        tone="info"
      />
      {musafir && (
        <p className="text-white/70 text-xs mt-2 px-1">
          {musafir.startAfter
            ? t('settings.musafirStartedAfter', {
                date: formatLocaleDate(new Date(`${musafir.startedAt}T12:00:00`), {
                  day: 'numeric',
                  month: 'short',
                }),
                prayer: translateSalatName(musafir.startAfter, musafir.startAfter, t),
              })
            : t('settings.musafirStartedOn', {
                date: formatLocaleDate(new Date(`${musafir.startedAt}T12:00:00`), {
                  day: 'numeric',
                  month: 'short',
                }),
              })}{' '}
          <button
            onClick={() => navigate('/musafir')}
            className="underline underline-offset-2 text-white/85 hover:text-white"
          >
            {t('settings.musafirChangeStart')}
          </button>
        </p>
      )}
      <button
        onClick={() => navigate('/musafir')}
        className="mt-3 w-full flex items-center justify-between gap-2 text-left px-3 py-2.5 rounded-control border border-brand-info/30 bg-brand-info/[0.08] text-brand-info text-sm font-bold hover:border-brand-info/60 transition-colors"
      >
        {t('settings.musafirOpen')}
        <ChevronRightIcon className="w-4 h-4 shrink-0" />
      </button>
    </SectionCard>
  );
}
