import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { BookOpenIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { DuaHandsIcon, Star8Icon } from '../icons/IslamicIcons.js';
import SadaqahVirtueCard from '../SadaqahVirtueCard.js';
import { translateReference } from '../../utils/localeReference.js';
import { FRIDAY_HOUR_REF } from '../../utils/fridayHour.js';
import { TODAY_SPECIAL_ID } from '../../utils/homeSpecial.js';
import type { HomeState } from './useHomeData.js';

/**
 * The detailed special-day block (rows, sadaqah virtue, Friday hour, al-Kahf),
 * always under the arch (2026-10-18: the Friday cards were below the goals).
 */
export function HomeSpecialBlock({
  blockDays,
  sadaqahVirtueDay,
  fridayHour,
  isFridayToday,
  hasSpecialBlock,
}: Pick<
  HomeState,
  'blockDays' | 'sadaqahVirtueDay' | 'fridayHour' | 'isFridayToday' | 'hasSpecialBlock'
>) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  return hasSpecialBlock ? (
    <div id={TODAY_SPECIAL_ID} className="scroll-mt-24">
      {blockDays.length > 0 && (
        <div className="mb-4 space-y-2">
          {blockDays.map((day) => (
            <Link key={day.id} to={`/special-day/${day.id}`} className="block">
              <div className="flex items-center gap-3 px-4 py-3 rounded-card border border-brand-border/70 bg-brand-deep shadow-elev-1 hover:border-brand-gold/40 hover:shadow-hover transition-[border-color,box-shadow]">
                <Star8Icon className="w-6 h-6 shrink-0 text-brand-gold" />
                <div className="min-w-0 flex-1">
                  <p className="text-white font-bold text-sm leading-tight">
                    {t(`specialDays.${day.id}.name`, day.name)}
                  </p>
                  <p className="text-white/60 text-xs leading-snug truncate mt-0.5">
                    {t(`specialDays.${day.id}.shortDesc`, day.shortDesc)}
                  </p>
                </div>
                <ChevronRightIcon className="w-4 h-4 shrink-0 text-white/40" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Days with extra sadaqah virtue (Friday, Ramadan, first 10 days of
          Dhul Hijjah, Arafah, Laylat al-Qadr): persistent, unlike the old
          30s-auto-dismissing Friday-only reminder this replaces. */}
      {sadaqahVirtueDay && <SadaqahVirtueCard day={sadaqahVirtueDay} />}

      {/* Friday: hour of response (Abū Dāwūd 1048, ṣaḥīḥ) */}
      {fridayHour.active && (
        <div
          className={`mb-4 rounded-card border p-4 shadow-elev-1 ${
            fridayHour.isFinalStretch
              ? 'border-brand-gold/60 bg-brand-gold/[0.12]'
              : 'border-brand-gold/25 bg-brand-gold/[0.06]'
          }`}
        >
          <div className="flex items-start gap-3">
            <DuaHandsIcon className="w-6 h-6 shrink-0 text-brand-gold" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <h2 className="font-display text-brand-gold font-semibold text-base">
                  {fridayHour.isFinalStretch ? t('home.fridayHourNow') : t('home.fridayHourTitle')}
                </h2>
                <span className="text-brand-gold text-xs font-bold tabular-nums">
                  {fridayHour.countdown} {t('home.toMaghrib')}
                </span>
              </div>
              <p className="text-white/70 text-xs mt-1.5 leading-relaxed">
                {t(
                  'home.fridayHourQuote',
                  '"{{text}}" Keep asking until the sun sets: for yourself, your parents, and the ummah.',
                  {
                    text: i18n.language === 'bn' ? FRIDAY_HOUR_REF.textBn : FRIDAY_HOUR_REF.text,
                  }
                )}
              </p>
              <a
                href={FRIDAY_HOUR_REF.url}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-white/60 hover:text-brand-gold underline underline-offset-2 mt-2 inline-block"
              >
                {translateReference(FRIDAY_HOUR_REF.source, i18n.language)} ·{' '}
                {translateReference(FRIDAY_HOUR_REF.grade, i18n.language)} ↗
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Friday: Surah al-Kahf, one tap into the reader */}
      {isFridayToday && (
        <button
          onClick={() => navigate('/quran/read/18?mode=single')}
          className="mb-4 w-full text-left rounded-card border border-brand-emerald/30 bg-brand-emerald/[0.07] shadow-elev-1 p-4 hover:border-brand-emerald/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <BookOpenIcon className="w-6 h-6 shrink-0 text-brand-emerald" />
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-brand-emerald font-semibold text-base">
                {t('home.fridayKahf')}
              </h2>
              <p className="text-white/70 text-xs mt-1 leading-relaxed">
                "{t('home.fridayKahfQuote', 'A light will shine for him between the two Fridays.')}"
              </p>
              <p className="text-white/60 text-[11px] mt-1">
                {translateReference('Ṣaḥīḥ at-Targhīb 736 · Ṣaḥīḥ', i18n.language)}
              </p>
            </div>
            <ChevronRightIcon className="w-5 h-5 shrink-0 text-brand-emerald" />
          </div>
        </button>
      )}
    </div>
  ) : null;
}
