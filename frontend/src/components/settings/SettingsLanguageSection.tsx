import { useTranslation } from 'react-i18next';
import i18n, { LANGUAGES } from '../../i18n.js';
import { LanguageIcon } from '@heroicons/react/24/outline';
import { syncQuranTranslationWithLang } from '../../utils/quranData.js';
import { OPTION_OFF, OPTION_ON, SectionCard } from './settingsParts.js';

export function SettingsLanguageSection() {
  const { t } = useTranslation();
  return (
    <SectionCard
      icon={<LanguageIcon className="w-5 h-5 text-brand-emerald" />}
      title={t('settings.language')}
      subtitle={t('settings.languageSubtitle')}
      delay={0.03}
    >
      <div className="grid grid-cols-2 gap-3">
        {LANGUAGES.map((l) => (
          <button
            key={l.id}
            onClick={() => {
              void i18n.changeLanguage(l.id);
              syncQuranTranslationWithLang(l.id);
            }}
            aria-pressed={i18n.resolvedLanguage === l.id}
            className={`p-3 rounded-control border text-sm font-bold transition-colors ${
              i18n.resolvedLanguage === l.id ? OPTION_ON : OPTION_OFF
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
      <p className="text-white/70 text-[11px] mt-3 leading-relaxed">{t('settings.languageNote')}</p>
    </SectionCard>
  );
}
