import { useTranslation } from 'react-i18next';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { useUpdateProfile } from '../../hooks/useUserProfile.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { GroqKeySetting } from './GroqKeySetting.js';
import { SectionCard, Toggle } from './settingsParts.js';

export function SettingsNaseehSection() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { aiEnabled, setAiEnabled } = useAuthStore();
  const updateProfile = useUpdateProfile();
  return (
    <SectionCard
      icon={<SparklesIcon className="w-5 h-5 text-brand-gold" />}
      title={t('settings.naseehSection')}
      subtitle={t('settings.naseehSubtitle')}
      delay={0.18}
    >
      <div className="space-y-3">
        <Toggle
          checked={aiEnabled}
          onChange={(v) => {
            setAiEnabled(v);
            // Through the profile hook so the cached profile follows (#141).
            if (user) updateProfile.mutateAsync({ aiEnabled: v }).catch(() => {});
          }}
          title={t('settings.enableNaseeh')}
          detail={t('settings.enableNaseehDetail')}
          tone="gold"
        />
        {aiEnabled && <GroqKeySetting t={t} />}
      </div>
    </SectionCard>
  );
}
