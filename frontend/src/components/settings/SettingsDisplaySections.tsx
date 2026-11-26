import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { EyeIcon, HomeIcon, ChevronRightIcon, SwatchIcon } from '@heroicons/react/24/outline';
import { LeafIcon } from '../icons/IslamicIcons.js';
import HomeLayoutEditor from '../home/HomeLayoutEditor.js';
import { ITEM } from '../bustanStyles.js';
import { useAnalyticsConsent } from '../../hooks/useAnalyticsConsent.js';
import { useUiStore } from '../../store/useUiStore.js';
import { analyticsConfigured } from '../../utils/analytics.js';
import { writeConsent } from '../../utils/analyticsConsent.js';
import { HomeSpecialPicker, ReduceMotionPicker, ThemeModePicker } from './AppearancePickers.js';
import { SectionCard, Toggle } from './settingsParts.js';

/** Appearance, Home and Accessibility: three cards, one after the other. */
export function SettingsDisplaySections() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const analyticsConsent = useAnalyticsConsent();
  const { highContrast, vibrationEnabled, setHighContrast, setVibrationEnabled } = useUiStore();
  return (
    <>
      {/* Appearance: theme mode (utils/theme.ts) */}
      <SectionCard
        icon={<SwatchIcon className="w-5 h-5 text-brand-gold" />}
        title={t('settings.appearanceSection')}
        subtitle={t('settings.appearanceSubtitle')}
        delay={0.13}
      >
        <ThemeModePicker t={t} />
      </SectionCard>

      {/* Home screen: today's special days, detailed / compact / minimal */}
      <SectionCard
        icon={<HomeIcon className="w-5 h-5 text-brand-emerald" />}
        title={t('settings.homeSection')}
        subtitle={t('settings.homeSubtitle')}
        delay={0.14}
      >
        <HomeSpecialPicker t={t} />
        <div className="mt-4">
          <HomeLayoutEditor />
        </div>
        <button
          onClick={() => navigate('/welcome')}
          className={`${ITEM} w-full mt-4 flex items-center gap-3`}
        >
          <LeafIcon className="w-5 h-5 shrink-0 text-brand-emerald" aria-hidden="true" />
          <span className="flex-1 min-w-0">
            <span className="block text-white font-bold text-sm">
              {t('settings.setupAgain', 'Run the welcome setup again')}
            </span>
            <span className="block text-white/70 text-xs mt-0.5">
              {t('settings.setupAgainDetail', 'Location, madhab, prayer method and your habits.')}
            </span>
          </span>
          <ChevronRightIcon className="w-4 h-4 shrink-0 text-white/60" aria-hidden="true" />
        </button>
      </SectionCard>

      {/* ── Accessibility ── */}
      <SectionCard
        icon={<EyeIcon className="w-5 h-5 text-brand-info" />}
        title={t('settings.accessibilitySection')}
        delay={0.15}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ReduceMotionPicker t={t} />
          <Toggle
            checked={highContrast}
            onChange={setHighContrast}
            title={t('settings.highContrast')}
            detail={t('settings.highContrastDetail')}
            tone="gold"
          />
          <Toggle
            checked={vibrationEnabled}
            onChange={setVibrationEnabled}
            title={t('settings.vibration')}
            detail={t('settings.vibrationDetail')}
          />
          {/* Only where this build counts visits at all (P2-10). Off until allowed. */}
          {analyticsConfigured() && (
            <Toggle
              checked={analyticsConsent === 'granted'}
              onChange={(v) => writeConsent(v ? 'granted' : 'denied')}
              title={t('settings.analyticsCount')}
              detail={t('settings.analyticsCountDetail')}
            />
          )}
        </div>
      </SectionCard>
    </>
  );
}
