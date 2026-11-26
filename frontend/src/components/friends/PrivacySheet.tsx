import { useTranslation } from 'react-i18next';
import {
  BookOpenIcon,
  EyeIcon,
  EyeSlashIcon,
  FireIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import { CrescentIcon, MosqueIcon, TasbihIcon } from '../icons/IslamicIcons.js';
import {
  useSetPrivacy,
  useSocialSummary,
  type SecretArea,
  type Visibility,
} from '../../hooks/useSocial.js';
import { OPTION_OFF, OPTION_ON, ROW, Sheet, SheetHeader, type SvgIcon } from './friendsParts.js';

const VISIBILITY_OPTIONS: { value: Visibility; Icon: SvgIcon }[] = [
  { value: 'hidden', Icon: EyeSlashIcon },
  { value: 'streaks', Icon: FireIcon },
  { value: 'detail', Icon: EyeIcon },
];
const SECRET_OPTIONS: { area: SecretArea; Icon: SvgIcon }[] = [
  { area: 'salat', Icon: MosqueIcon },
  { area: 'zikr', Icon: TasbihIcon },
  { area: 'quran', Icon: BookOpenIcon },
  { area: 'fasting', Icon: CrescentIcon },
];

/** What friends see of me (three levels) + secret deeds (T3.6, FIQH-03). */
function PrivacySettingsBlock() {
  const { t } = useTranslation();
  const { data: summary } = useSocialSummary();
  const setPrivacy = useSetPrivacy();
  const privacy = summary?.privacy;
  // Show the choice at once; the refetch after the save confirms it
  const pending = setPrivacy.isPending ? setPrivacy.variables : undefined;
  const visibility = pending?.visibility ?? privacy?.visibility;
  const isSecret = (area: SecretArea): boolean =>
    pending?.secret?.[area] ?? privacy?.secret[area] ?? false;

  return (
    <div className={`${ROW} space-y-3`}>
      <div role="radiogroup" aria-labelledby="friends-visibility-title" className="space-y-1.5">
        <p id="friends-visibility-title" className="text-white font-bold text-sm">
          {t('friends.privacy.title')}
        </p>
        {VISIBILITY_OPTIONS.map(({ value, Icon }) => {
          const on = visibility === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={!privacy || setPrivacy.isPending}
              onClick={() => !on && setPrivacy.mutate({ visibility: value })}
              className={`w-full min-h-[44px] flex items-start gap-2.5 rounded-control border px-3 py-2 text-left transition-colors ${
                on ? OPTION_ON : OPTION_OFF
              }`}
            >
              <Icon
                className={`w-5 h-5 mt-0.5 shrink-0 ${on ? 'text-brand-emerald' : 'text-white/70'}`}
              />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold">{t(`friends.privacy.${value}`)}</span>
                <span className="block text-xs text-white/70 leading-relaxed">
                  {t(`friends.privacy.${value}Desc`)}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-1.5">
        <p className="flex items-center gap-1.5 text-white font-bold text-sm">
          <LockClosedIcon className="w-4 h-4 text-brand-gold" />
          {t('friends.privacy.secretTitle')}
        </p>
        <p className="text-white/70 text-xs leading-relaxed">{t('friends.privacy.secretDesc')}</p>
        <div className="grid grid-cols-2 gap-1.5">
          {SECRET_OPTIONS.map(({ area, Icon }) => {
            const on = isSecret(area);
            return (
              <button
                key={area}
                type="button"
                aria-pressed={on}
                disabled={!privacy || setPrivacy.isPending}
                onClick={() => setPrivacy.mutate({ secret: { [area]: !on } })}
                className={`min-h-[44px] inline-flex items-center gap-2 rounded-control border px-3 py-2 text-xs font-bold transition-colors ${
                  on ? 'bg-brand-gold/10 border-brand-gold text-white' : OPTION_OFF
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${on ? 'text-brand-gold' : 'text-white/70'}`} />
                <span className="flex-1 text-left">{t(`friends.privacy.area.${area}`)}</span>
                {on && <LockClosedIcon className="w-3.5 h-3.5 text-brand-gold shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** "What friends see" (U3: its own sheet in the Friends menu). */
export function PrivacySheet({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Sheet onClose={onClose} labelledBy="friends-privacy-title">
      <SheetHeader
        id="friends-privacy-title"
        Icon={EyeIcon}
        title={t('friends.privacy.title')}
        subtitle={t('friends.privacySubtitle')}
        onClose={onClose}
      />
      <PrivacySettingsBlock />
    </Sheet>
  );
}
