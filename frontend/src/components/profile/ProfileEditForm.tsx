import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircleIcon,
  CalendarDaysIcon,
  MapPinIcon,
  BriefcaseIcon,
  XMarkIcon,
  IdentificationIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { SORTED_COUNTRIES } from './profileParts.js';

export interface ProfileEditFormProps {
  ageInfo: { years: number; months: number } | null;
  cityOptions: string[];
  googleFirstName: string;
  googleLastName: string;
  handleCountryChange: (country: string) => void;
  isDirty: boolean;
  profile: import('./profileParts.js').ProfileData;
  saveError: string;
  saveProfile: () => Promise<void>;
  saveSuccess: boolean;
  saving: boolean;
  setProfile: React.Dispatch<React.SetStateAction<import('./profileParts.js').ProfileData>>;
}

export default function ProfileEditForm({
  ageInfo,
  cityOptions,
  googleFirstName,
  googleLastName,
  handleCountryChange,
  isDirty,
  profile,
  saveError,
  saveProfile,
  saveSuccess,
  saving,
  setProfile,
}: ProfileEditFormProps) {
  const { t } = useTranslation();
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.11 }}
        className="card bg-brand-surface border border-brand-border rounded-2xl"
      >
        <div className="card-body p-5 sm:p-6 space-y-4">
          <p className="text-white/30 text-xs font-bold uppercase tracking-widest">
            {t('profile.editDetails', 'Edit Details')}
          </p>

          <AnimatePresence>
            {saveSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ type: 'spring', damping: 20 }}
                className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-brand-emerald/15 border border-brand-emerald/40"
              >
                <CheckCircleIcon className="w-4 h-4 text-brand-emerald shrink-0" />
                <span className="text-brand-emerald text-sm font-semibold">
                  {t('profile.savedSuccess', 'Profile saved successfully!')}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Display name */}
          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-white/60 text-sm">
                {t('profile.displayName', 'Display Name')}
              </span>
            </label>
            <input
              type="text"
              className="input input-sm input-bordered bg-brand-deep border-brand-border text-white focus:border-brand-emerald focus:outline-none transition-colors"
              placeholder={t('profile.displayNamePlaceholder', 'How you appear in the app')}
              value={profile.displayName}
              onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))}
            />
          </div>

          {/* First / Last name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-white/60 text-sm">
                  {t('profile.firstName', 'First Name')}
                </span>
              </label>
              <input
                type="text"
                className="input input-sm input-bordered bg-brand-deep border-brand-border text-white focus:border-brand-emerald focus:outline-none transition-colors"
                placeholder={googleFirstName || t('profile.first', 'First')}
                value={profile.firstName}
                onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
              />
            </div>
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-white/60 text-sm">
                  {t('profile.lastName', 'Last Name')}
                </span>
              </label>
              <input
                type="text"
                className="input input-sm input-bordered bg-brand-deep border-brand-border text-white focus:border-brand-emerald focus:outline-none transition-colors"
                placeholder={googleLastName || t('profile.last', 'Last')}
                value={profile.lastName}
                onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
              />
            </div>
          </div>

          {/* Bio */}
          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-white/60 text-sm">{t('profile.bio', 'Bio')}</span>
              <span className="label-text-alt text-white/20 text-xs">{profile.bio.length}/250</span>
            </label>
            <textarea
              className="textarea textarea-bordered bg-brand-deep border-brand-border text-white text-sm focus:border-brand-emerald focus:outline-none resize-none transition-colors"
              placeholder={t('profile.bioPlaceholder', 'A short sentence about yourself…')}
              rows={2}
              maxLength={250}
              value={profile.bio}
              onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
            />
          </div>

          {/* Country → City dropdowns */}
          <div className="grid grid-cols-2 gap-3">
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-white/60 text-sm flex items-center gap-1">
                  <MapPinIcon className="w-3.5 h-3.5" /> {t('profile.country', 'Country')}
                </span>
              </label>
              <select
                className="select select-sm select-bordered bg-brand-deep border-brand-border text-white focus:border-brand-emerald focus:outline-none transition-colors"
                value={profile.country}
                onChange={(e) => handleCountryChange(e.target.value)}
              >
                <option value="">{t('profile.selectCountry', 'Select country')}</option>
                {SORTED_COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-white/60 text-sm">
                  {t('profile.city', 'City')}
                </span>
              </label>
              {cityOptions.length > 0 ? (
                <select
                  className="select select-sm select-bordered bg-brand-deep border-brand-border text-white focus:border-brand-emerald focus:outline-none transition-colors"
                  value={profile.city}
                  onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))}
                >
                  <option value="">{t('profile.selectCity', 'Select city')}</option>
                  {cityOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className="input input-sm input-bordered bg-brand-deep border-brand-border text-white focus:border-brand-emerald focus:outline-none transition-colors"
                  placeholder={
                    profile.country
                      ? t('profile.enterCity', 'Enter city')
                      : t('profile.selectCountryFirst', 'Select country first')
                  }
                  value={profile.city}
                  onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))}
                />
              )}
            </div>
          </div>

          {/* Occupation */}
          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-white/60 text-sm flex items-center gap-1">
                <BriefcaseIcon className="w-3.5 h-3.5" /> {t('profile.occupation', 'Occupation')}
              </span>
            </label>
            <input
              type="text"
              className="input input-sm input-bordered bg-brand-deep border-brand-border text-white focus:border-brand-emerald focus:outline-none transition-colors"
              placeholder={t('profile.occupationPlaceholder', 'Your profession or field')}
              value={profile.occupation}
              onChange={(e) => setProfile((p) => ({ ...p, occupation: e.target.value }))}
            />
          </div>

          {/* Gender / Birth date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-white/60 text-sm flex items-center gap-1">
                  <IdentificationIcon className="w-3.5 h-3.5" /> {t('profile.gender', 'Gender')}
                </span>
              </label>
              <select
                className="select select-sm select-bordered bg-brand-deep border-brand-border text-white focus:border-brand-emerald focus:outline-none transition-colors"
                value={profile.gender}
                onChange={(e) => setProfile((p) => ({ ...p, gender: e.target.value }))}
              >
                <option value="">{t('profile.notSet', 'Not set')}</option>
                <option value="male">{t('profile.male', 'Male')}</option>
                <option value="female">{t('profile.female', 'Female')}</option>
              </select>
              <p className="text-white/25 text-[11px] mt-1 leading-relaxed">
                {t(
                  'profile.genderHelp',
                  'Personalises greetings and content — you can change this anytime.'
                )}
              </p>
              <AnimatePresence>
                {profile.gender === 'female' && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-brand-pink/70 text-[11px] mt-1.5 flex items-start gap-1 overflow-hidden"
                  >
                    <SparklesIcon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      {t(
                        'profile.genderFemaleNote',
                        "You'll see Rayhanah — cycle-aware salat & fasting tracking, just for you."
                      )}
                    </span>
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-white/60 text-sm flex items-center gap-1">
                  <CalendarDaysIcon className="w-3.5 h-3.5" />{' '}
                  {t('profile.birthDate', 'Birth Date')}
                </span>
                {profile.birthDate && (
                  <button
                    type="button"
                    className="label-text-alt flex items-center gap-0.5 text-white/30 hover:text-red-400 text-xs transition-colors"
                    onClick={() => setProfile((p) => ({ ...p, birthDate: '' }))}
                    title={t('profile.clearBirthDate', 'Clear birth date')}
                  >
                    <XMarkIcon className="w-3 h-3" /> {t('profile.clear', 'Clear')}
                  </button>
                )}
              </label>
              <input
                type="date"
                className="input input-sm input-bordered bg-brand-deep border-brand-border text-white focus:border-brand-emerald focus:outline-none transition-colors [color-scheme:dark]"
                value={profile.birthDate}
                max={new Date().toISOString().substring(0, 10)}
                onChange={(e) => setProfile((p) => ({ ...p, birthDate: e.target.value }))}
              />
              {ageInfo && (
                <p className="text-white/30 text-xs mt-1">
                  {t('profile.ageDisplay', 'Age: {{years}} years, {{months}} month{{suffix}}', {
                    years: ageInfo.years,
                    months: ageInfo.months,
                    suffix: ageInfo.months !== 1 ? 's' : '',
                  })}
                </p>
              )}
            </div>
          </div>

          {saveError && <p className="text-red-400 text-xs">{saveError}</p>}

          <button
            className={`btn btn-sm w-full mt-1 gap-2 transition-all duration-300 border-0 ${
              isDirty && !saving
                ? 'bg-brand-emerald hover:bg-brand-emerald-dim text-white shadow-[0_0_20px_rgba(16,185,129,0.35)]'
                : 'bg-brand-surface border border-brand-border text-white/30 cursor-not-allowed'
            }`}
            onClick={saveProfile}
            disabled={!isDirty || saving}
          >
            {saving ? (
              <>
                <span className="loading loading-spinner loading-xs" />{' '}
                {t('profile.saving', 'Saving…')}
              </>
            ) : isDirty ? (
              t('profile.saveChanges', 'Save Changes')
            ) : (
              t('profile.noChanges', 'No changes')
            )}
          </button>
        </div>
      </motion.div>
    </>
  );
}
