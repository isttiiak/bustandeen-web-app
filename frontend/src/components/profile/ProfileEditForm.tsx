import React from 'react';
import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircleIcon,
  CalendarDaysIcon,
  MapPinIcon,
  BriefcaseIcon,
  XMarkIcon,
  IdentificationIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import { FlowerIcon } from '../icons/IslamicIcons.js';
import { BTN_PRIMARY, CARD, SECTION_TITLE } from '../bustanStyles.js';
import { formatLocaleNumber } from '../../utils/localeDate.js';
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

/** Inputs and selects: the theme's surface, no DaisyUI chrome colours. The
 *  date picker's colours follow the theme's color-scheme (styles/global.css). */
const FIELD =
  'w-full rounded-control border border-brand-border bg-brand-surface/50 text-white placeholder:text-white/50 focus:border-brand-emerald focus:outline-none transition-colors';
// h-11: 44px tall, a comfortable tap target (T3.5)
const INPUT = `input input-sm h-11 ${FIELD}`;
const SELECT = `select select-sm h-11 ${FIELD}`;
const LABEL = 'text-white/80 text-sm font-semibold flex items-center gap-1.5 mb-1.5';

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
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.11 }}
      className={`${CARD} p-5 sm:p-6 space-y-4`}
    >
      <h2 className={SECTION_TITLE}>
        <PencilSquareIcon className="w-5 h-5 text-brand-emerald" />
        {t('profile.editDetails', 'Edit Details')}
      </h2>

      <AnimatePresence>
        {saveSuccess && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="status"
            className="flex items-center gap-2 py-2.5 px-3 rounded-control bg-brand-emerald/10 border border-brand-emerald/50 text-brand-emerald text-sm font-semibold"
          >
            <CheckCircleIcon className="w-5 h-5 shrink-0" />
            {t('profile.savedSuccess', 'Profile saved successfully!')}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Display name */}
      <div>
        <label htmlFor="profile-display-name" className={LABEL}>
          {t('profile.displayName', 'Display Name')}
        </label>
        <input
          id="profile-display-name"
          type="text"
          className={INPUT}
          placeholder={t('profile.displayNamePlaceholder', 'How you appear in the app')}
          value={profile.displayName}
          onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))}
        />
      </div>

      {/* First / Last name */}
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <label htmlFor="profile-first-name" className={LABEL}>
            {t('profile.firstName', 'First Name')}
          </label>
          <input
            id="profile-first-name"
            type="text"
            className={INPUT}
            placeholder={googleFirstName || t('profile.first', 'First')}
            value={profile.firstName}
            onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
          />
        </div>
        <div className="min-w-0">
          <label htmlFor="profile-last-name" className={LABEL}>
            {t('profile.lastName', 'Last Name')}
          </label>
          <input
            id="profile-last-name"
            type="text"
            className={INPUT}
            placeholder={googleLastName || t('profile.last', 'Last')}
            value={profile.lastName}
            onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
          />
        </div>
      </div>

      {/* Bio */}
      <div>
        <label htmlFor="profile-bio" className={`${LABEL} justify-between`}>
          <span>{t('profile.bio', 'Bio')}</span>
          <span className="text-white/70 text-xs font-normal tabular-nums">
            {formatLocaleNumber(profile.bio.length)}/{formatLocaleNumber(250)}
          </span>
        </label>
        <textarea
          id="profile-bio"
          className={`textarea text-sm resize-none ${FIELD}`}
          placeholder={t('profile.bioPlaceholder', 'A short sentence about yourself…')}
          rows={2}
          maxLength={250}
          value={profile.bio}
          onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
        />
      </div>

      {/* Country, then city */}
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <label htmlFor="profile-country" className={LABEL}>
            <MapPinIcon className="w-4 h-4 text-brand-emerald" /> {t('profile.country', 'Country')}
          </label>
          <select
            id="profile-country"
            className={SELECT}
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
        <div className="min-w-0">
          <label htmlFor="profile-city" className={LABEL}>
            {t('profile.city', 'City')}
          </label>
          {cityOptions.length > 0 ? (
            <select
              id="profile-city"
              className={SELECT}
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
              id="profile-city"
              type="text"
              className={INPUT}
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
      <div>
        <label htmlFor="profile-occupation" className={LABEL}>
          <BriefcaseIcon className="w-4 h-4 text-brand-gold" />{' '}
          {t('profile.occupation', 'Occupation')}
        </label>
        <input
          id="profile-occupation"
          type="text"
          className={INPUT}
          placeholder={t('profile.occupationPlaceholder', 'Your profession or field')}
          value={profile.occupation}
          onChange={(e) => setProfile((p) => ({ ...p, occupation: e.target.value }))}
        />
      </div>

      {/* Gender / Birth date */}
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <label htmlFor="profile-gender" className={LABEL}>
            <IdentificationIcon className="w-4 h-4 text-brand-info" />{' '}
            {t('profile.gender', 'Gender')}
          </label>
          <select
            id="profile-gender"
            className={SELECT}
            value={profile.gender}
            onChange={(e) => setProfile((p) => ({ ...p, gender: e.target.value }))}
          >
            <option value="">{t('profile.notSet', 'Not set')}</option>
            <option value="male">{t('profile.male', 'Male')}</option>
            <option value="female">{t('profile.female', 'Female')}</option>
          </select>
          <p className="text-white/70 text-xs mt-1.5 leading-relaxed">
            {t(
              'profile.genderHelp',
              'Personalises greetings and content. You can change this anytime.'
            )}
          </p>
          {profile.gender === 'female' && (
            <p className="text-brand-pink text-xs mt-1.5 flex items-start gap-1.5 leading-relaxed">
              <FlowerIcon className="w-4 h-4 shrink-0" />
              <span>
                {t(
                  'profile.genderFemaleNote',
                  "You'll see Rayhanah: cycle-aware salat and fasting tracking, just for you."
                )}
              </span>
            </p>
          )}
        </div>

        <div className="min-w-0">
          <div className={`${LABEL} justify-between`}>
            <label htmlFor="profile-birth-date" className="flex items-center gap-1.5">
              <CalendarDaysIcon className="w-4 h-4 text-brand-warm" />
              {t('profile.birthDate', 'Birth Date')}
            </label>
            {profile.birthDate && (
              <button
                type="button"
                className="flex items-center gap-0.5 text-white/70 hover:text-red-400 text-xs font-normal transition-colors"
                onClick={() => setProfile((p) => ({ ...p, birthDate: '' }))}
                title={t('profile.clearBirthDate', 'Clear birth date')}
              >
                <XMarkIcon className="w-3.5 h-3.5" /> {t('profile.clear', 'Clear')}
              </button>
            )}
          </div>
          <input
            id="profile-birth-date"
            type="date"
            className={INPUT}
            value={profile.birthDate}
            max={new Date().toISOString().substring(0, 10)}
            onChange={(e) => setProfile((p) => ({ ...p, birthDate: e.target.value }))}
          />
          {ageInfo && (
            <p className="text-white/70 text-xs mt-1.5">
              {t('profile.ageDisplay', {
                years: formatLocaleNumber(ageInfo.years),
                months: formatLocaleNumber(ageInfo.months),
                count: ageInfo.months,
              })}
            </p>
          )}
        </div>
      </div>

      {saveError && (
        <p role="alert" className="text-red-400 text-xs">
          {saveError}
        </p>
      )}

      <button
        type="button"
        className={`${BTN_PRIMARY} w-full`}
        onClick={() => void saveProfile()}
        disabled={!isDirty || saving}
      >
        {saving ? (
          <>
            <span className="loading loading-spinner loading-xs" /> {t('profile.saving', 'Saving…')}
          </>
        ) : isDirty ? (
          t('profile.saveChanges', 'Save Changes')
        ) : (
          t('profile.noChanges', 'No changes')
        )}
      </button>
    </motion.section>
  );
}
