import { useState } from 'react';
import { m as motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  ArrowPathIcon,
  Cog6ToothIcon,
  MoonIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import AnimatedBackground from '../components/AnimatedBackground.js';
import FreshStart from '../components/FreshStart.js';
import KazaDebtReset from '../components/KazaDebtReset.js';
import ZikrLibrarySection from '../components/ZikrLibrarySection.js';
import { TasbihIcon } from '../components/icons/IslamicIcons.js';
import HijriDateSetting from '../components/settings/HijriDateSetting.js';
import { DeleteAccountPanel } from '../components/settings/DeleteAccountPanel.js';
import { SavedLocationRow } from '../components/settings/SavedLocationRow.js';
import { SettingsBackupControls } from '../components/settings/SettingsBackupControls.js';
import { SettingsDangerZone } from '../components/settings/SettingsDangerZone.js';
import { SettingsDayStartSection } from '../components/settings/SettingsDayStartSection.js';
import { SettingsDisplaySections } from '../components/settings/SettingsDisplaySections.js';
import { SettingsLanguageSection } from '../components/settings/SettingsLanguageSection.js';
import { SettingsMusafirSection } from '../components/settings/SettingsMusafirSection.js';
import { SettingsNaseehSection } from '../components/settings/SettingsNaseehSection.js';
import { SectionCard } from '../components/settings/settingsParts.js';

export default function Settings() {
  const { t } = useTranslation();
  const [savedLocation, setSavedLocation] = useState<string | null>(() => {
    try {
      const s = localStorage.getItem('bustandeen_location');
      return s ? ((JSON.parse(s) as { name?: string }).name ?? 'Saved location') : null;
    } catch {
      return null;
    }
  });

  return (
    <AnimatedBackground variant="dark">
      <div className="px-4 pt-3 pb-16 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto space-y-5">
          {/* ── The screen's one arch ── */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-6 pt-10 pb-6 text-center"
          >
            <div className="w-16 h-16 mx-auto rounded-full grid place-items-center bg-brand-emerald/10 border border-brand-emerald/30">
              <Cog6ToothIcon className="w-8 h-8 text-brand-emerald" />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-4">
              {t('settings.title')}
            </h1>
            <p className="text-sm text-white/70 mt-1">{t('settings.subtitle')}</p>
          </motion.section>

          {/* ── Language — kept at the very top so it's the first thing found ── */}
          <SettingsLanguageSection />

          {/* ── Musafir mode — right under Language so a traveller finds it fast ── */}
          <SettingsMusafirSection />

          {/* ── Islamic calendar ── */}
          <SectionCard
            icon={<MoonIcon className="w-5 h-5 text-brand-gold" />}
            title={t('settings.hijriSection')}
            subtitle={t('settings.hijriSubtitle')}
            delay={0.1}
          >
            <HijriDateSetting />
          </SectionCard>

          {/* ── Tracking day boundary ── */}
          <SettingsDayStartSection savedLocation={savedLocation} />

          {/* Appearance, Home screen and Accessibility */}
          <SettingsDisplaySections />

          {/* ── Naseeh AI companion ── */}
          <SettingsNaseehSection />

          {/* ── Zikr library ── */}
          <SectionCard
            icon={<TasbihIcon className="w-5 h-5 text-brand-emerald" />}
            title={t('settings.zikrLibrary')}
            subtitle={t('settings.zikrLibrarySubtitle')}
            delay={0.22}
          >
            <ZikrLibrarySection />
          </SectionCard>

          {/* ── Fresh start (U7): stats restart from a day, nothing deleted ── */}
          <SectionCard
            icon={<ArrowPathIcon className="w-5 h-5 text-brand-emerald" />}
            title={t('freshStart.title')}
            subtitle={t('freshStart.sub')}
            delay={0.24}
          >
            <FreshStart withAll />
            {/* Kaza debt: its own reset, never part of Reset all */}
            <div className="mt-3">
              <KazaDebtReset row />
            </div>
          </SectionCard>

          {/* ── Your data ── */}
          <SectionCard
            icon={<ShieldCheckIcon className="w-5 h-5 text-brand-emerald" />}
            title={t('settings.dataSection')}
            subtitle={t('settings.dataSubtitle')}
            delay={0.25}
          >
            <SettingsBackupControls />

            {/* Saved prayer location (stored only in this browser) */}
            <SavedLocationRow savedLocation={savedLocation} setSavedLocation={setSavedLocation} />

            <SettingsDangerZone />

            {/* Delete entire account */}
            <DeleteAccountPanel />
          </SectionCard>
        </div>
      </div>
    </AnimatedBackground>
  );
}
