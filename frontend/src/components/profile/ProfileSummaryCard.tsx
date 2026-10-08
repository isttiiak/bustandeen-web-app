import React from 'react';
import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import {
  UserCircleIcon,
  PencilIcon,
  MapPinIcon,
  BriefcaseIcon,
  FireIcon,
  CakeIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { UserAvatar } from '../icons/AvatarGlyphs.js';
import { TasbihIcon } from '../icons/IslamicIcons.js';
import { TILE } from '../bustanStyles.js';
import { formatLocaleNumber } from '../../utils/localeDate.js';
import { CountryFlag } from './profileParts.js';

export interface ProfileSummaryCardProps {
  ageInfo: { years: number; months: number } | null;
  longestStreak: number | null;
  memberSince: string | null;
  preview: string;
  avatarId: string | null;
  profile: import('./profileParts.js').ProfileData;
  setShowPhotoChoice: React.Dispatch<React.SetStateAction<boolean>>;
  totalZikr: string;
  uploading: boolean;
  user: import('../../types/api.js').AuthUser | null;
}

/** The Profile arch (the screen's one hero) and the four stat tiles under it. */
export default function ProfileSummaryCard({
  ageInfo,
  longestStreak,
  memberSince,
  preview,
  avatarId,
  profile,
  setShowPhotoChoice,
  totalZikr,
  uploading,
  user,
}: ProfileSummaryCardProps) {
  const { t } = useTranslation();
  const name =
    profile.displayName ||
    profile.firstName ||
    user?.email?.split('@')[0] ||
    t('profile.anonymous', 'Anonymous');
  const place = [profile.city, profile.country].filter(Boolean).join(', ');

  const stats: {
    Icon: (p: { className?: string }) => React.ReactNode;
    tone: string;
    value: string;
    label: string;
  }[] = [
    {
      Icon: TasbihIcon,
      tone: 'text-brand-emerald',
      value: totalZikr,
      label: t('profile.totalZikr', 'Total Zikr'),
    },
    {
      Icon: FireIcon,
      tone: 'text-brand-gold',
      value: longestStreak !== null ? formatLocaleNumber(longestStreak) : '-',
      label: t('profile.bestStreak', 'Best Streak'),
    },
    {
      Icon: CakeIcon,
      tone: 'text-brand-info',
      value: ageInfo
        ? t('profile.ageShort', '{{years}}y {{months}}m', {
            years: formatLocaleNumber(ageInfo.years),
            months: formatLocaleNumber(ageInfo.months),
          })
        : '-',
      label: t('profile.age', 'Age'),
    },
    {
      Icon: CalendarDaysIcon,
      tone: 'text-brand-warm',
      value: memberSince ?? '-',
      label: t('profile.memberSince', 'Member Since'),
    },
  ];

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-6 pt-10 pb-6 text-center"
      >
        <p className="text-xs font-bold uppercase tracking-widest text-white/70">
          {t('profile.title', 'My Profile')}
        </p>

        <div className="relative w-24 h-24 mx-auto mt-4">
          <div className="w-24 h-24 rounded-full overflow-hidden ring-2 ring-brand-emerald ring-offset-2 ring-offset-brand-deep">
            {preview || avatarId ? (
              <UserAvatar
                photoUrl={preview || null}
                avatarId={avatarId}
                name={profile.displayName}
                className="w-24 h-24"
              />
            ) : (
              <div className="w-full h-full bg-brand-emerald/10 grid place-items-center">
                <UserCircleIcon className="w-16 h-16 text-brand-emerald" />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowPhotoChoice(true)}
            aria-label={t('profile.changePhoto', 'Change Photo')}
            title={t('profile.changePhoto', 'Change Photo')}
            disabled={uploading}
            className="btn-solid absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-brand-emerald-dim hover:brightness-110 text-on-color shadow-elev-2 border-2 border-brand-deep grid place-items-center transition disabled:opacity-50"
          >
            {uploading ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <PencilIcon className="w-4 h-4" />
            )}
          </button>
        </div>

        <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-4 flex items-center justify-center gap-2 flex-wrap break-words">
          {name}
          {profile.country && <CountryFlag countryName={profile.country} />}
        </h1>

        {(place || profile.occupation) && (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-white/75">
            {place && (
              <span className="inline-flex items-center gap-1">
                <MapPinIcon className="w-4 h-4 text-brand-emerald" />
                {place}
              </span>
            )}
            {profile.occupation && (
              <span className="inline-flex items-center gap-1">
                <BriefcaseIcon className="w-4 h-4 text-brand-gold" />
                {profile.occupation}
              </span>
            )}
          </div>
        )}

        {profile.bio && (
          <p className="text-sm text-white/80 mt-3 leading-relaxed max-w-md mx-auto break-words">
            {profile.bio}
          </p>
        )}
      </motion.section>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {stats.map(({ Icon, tone, value, label }) => (
          <div key={label} className={TILE}>
            <Icon className={`w-5 h-5 mx-auto ${tone}`} />
            <p className="font-display text-white font-bold text-base mt-1.5 tabular-nums leading-tight break-words">
              {value}
            </p>
            <p className="text-white/70 text-xs mt-0.5 leading-tight">{label}</p>
          </div>
        ))}
      </motion.div>
    </>
  );
}
