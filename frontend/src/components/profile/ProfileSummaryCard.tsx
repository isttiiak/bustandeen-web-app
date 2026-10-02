import React from 'react';
import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import { UserCircleIcon, CameraIcon, MapPinIcon, BriefcaseIcon } from '@heroicons/react/24/outline';
import { CountryFlag, SPARKLE_POSITIONS } from './profileParts.js';

export interface ProfileSummaryCardProps {
  ageInfo: { years: number; months: number } | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  longestStreak: number | null;
  memberSince: string | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  preview: string;
  profile: import('./profileParts.js').ProfileData;
  setShowPhotoChoice: React.Dispatch<React.SetStateAction<boolean>>;
  totalZikr: string;
  uploading: boolean;
  user: import('../../types/api.js').AuthUser | null;
}

export default function ProfileSummaryCard({
  ageInfo,
  fileInputRef,
  longestStreak,
  memberSince,
  onFileChange,
  preview,
  profile,
  setShowPhotoChoice,
  totalZikr,
  uploading,
  user,
}: ProfileSummaryCardProps) {
  const { t } = useTranslation();
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="relative rounded-2xl border border-brand-emerald/20 overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, #0a1628 0%, #0e2040 25%, #112244 50%, #0a1a30 75%, #080c12 100%)',
        }}
      >
        {/* Animated sparkle dots */}
        <div className="absolute inset-0 pointer-events-none">
          {SPARKLE_POSITIONS.map((s, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-brand-emerald"
              style={{
                left: s.left,
                top: s.top,
                width: i % 3 === 0 ? 3 : 2,
                height: i % 3 === 0 ? 3 : 2,
              }}
              animate={{ opacity: [0.1, 0.7, 0.1], scale: [0.8, 1.6, 0.8], y: [-3, 3, -3] }}
              transition={{
                duration: 2.5 + i * 0.4,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: s.delay,
              }}
            />
          ))}
          {/* Subtle gradient shimmer line */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-emerald/30 to-transparent" />
        </div>

        <div className="relative p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="avatar">
                <div className="w-24 rounded-full ring-2 ring-brand-emerald ring-offset-2 ring-offset-[#0a1628]">
                  {preview || profile.photoUrl ? (
                    <img src={preview || profile.photoUrl} alt="profile" className="object-cover" />
                  ) : (
                    <div className="w-full h-full bg-brand-emerald/20 flex items-center justify-center">
                      <UserCircleIcon className="w-16 h-16 text-brand-emerald/50" />
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPhotoChoice(true)}
                disabled={uploading}
                className="absolute bottom-0 right-0 group w-8 h-8 rounded-full bg-brand-emerald hover:bg-brand-emerald-dim text-white shadow-lg flex items-center justify-center transition-colors disabled:opacity-50"
              >
                <CameraIcon className="w-4 h-4" />
                <span className="absolute -top-7 right-0 bg-brand-deep border border-brand-border text-white/70 text-[10px] px-2 py-0.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {t('profile.changePhoto', 'Change Photo')}
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFileChange}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 text-center sm:text-left space-y-1">
              <p className="text-xl font-black text-white leading-tight flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                {profile.displayName ||
                  profile.firstName ||
                  user?.email?.split('@')[0] ||
                  t('profile.anonymous', 'Anonymous')}
                {profile.country && <CountryFlag countryName={profile.country} />}
              </p>
              {(profile.city || profile.country) && (
                <p className="flex items-center justify-center sm:justify-start gap-1 text-white/40 text-sm">
                  <MapPinIcon className="w-3.5 h-3.5 text-brand-emerald/60" />
                  {[profile.city, profile.country].filter(Boolean).join(', ')}
                </p>
              )}
              {profile.occupation && (
                <p className="flex items-center justify-center sm:justify-start gap-1 text-white/40 text-sm">
                  <BriefcaseIcon className="w-3.5 h-3.5" /> {profile.occupation}
                </p>
              )}
              {profile.bio && (
                <p className="text-white/50 text-sm mt-2 italic leading-snug">{profile.bio}</p>
              )}
            </div>
          </div>

          {/* Quick stats — 4 columns */}
          <div className="grid grid-cols-4 gap-2 mt-5 pt-5 border-t border-brand-emerald/15">
            <div className="text-center">
              <p className="text-brand-emerald font-black text-base tabular-nums">{totalZikr}</p>
              <p className="text-white/30 text-[10px] uppercase tracking-wide leading-tight mt-0.5">
                {t('profile.totalZikr', 'Total Zikr')}
              </p>
            </div>
            <div className="text-center border-x border-brand-emerald/10">
              <p className="text-brand-gold font-black text-base">
                {longestStreak !== null ? longestStreak : '—'}
              </p>
              <p className="text-white/30 text-[10px] uppercase tracking-wide leading-tight mt-0.5">
                {t('profile.bestStreak', 'Best Streak')}
              </p>
            </div>
            <div className="text-center border-r border-brand-emerald/10">
              <p className="text-white/70 font-black text-base leading-tight">
                {ageInfo ? `${ageInfo.years}y ${ageInfo.months}m` : '—'}
              </p>
              <p className="text-white/30 text-[10px] uppercase tracking-wide leading-tight mt-0.5">
                {t('profile.age', 'Age')}
              </p>
            </div>
            <div className="text-center">
              <p className="text-white/50 font-bold text-xs leading-tight">{memberSince ?? '—'}</p>
              <p className="text-white/30 text-[10px] uppercase tracking-wide leading-tight mt-0.5">
                {t('profile.memberSince', 'Member Since')}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
