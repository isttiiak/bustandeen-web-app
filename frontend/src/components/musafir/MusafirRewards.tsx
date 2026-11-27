import { useTranslation } from 'react-i18next';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { CARD, SECTION_TITLE } from '../bustanStyles.js';
import { DuaHandsIcon } from '../icons/IslamicIcons.js';
import { REF_REWARD_FLOWS, REF_DUA_ANSWERED } from '../../utils/musafir.js';
import { RefQuote } from './MusafirBits.js';
import { type MusafirPage } from './useMusafirPage.js';

export default function MusafirRewards({ page }: { page: MusafirPage }) {
  const { t } = useTranslation();
  const { lang } = page;

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <div className={`${CARD} p-4`}>
        <h3 className={`${SECTION_TITLE} !text-sm`}>
          <SparklesIcon className="w-5 h-5 text-brand-gold" aria-hidden />
          {t('musafir.rewardTitle', 'Your good deeds keep flowing')}
        </h3>
        <p className="text-white/70 text-[11px] mt-0.5 mb-2">
          {t(
            'musafir.rewardSub',
            'Can’t keep your usual adhkar or nafl on the road? The reward is still written.'
          )}
        </p>
        <RefQuote r={REF_REWARD_FLOWS} lang={lang} />
      </div>
      <div className={`${CARD} p-4`}>
        <h3 className={`${SECTION_TITLE} !text-sm`}>
          <DuaHandsIcon className="w-5 h-5 text-brand-gold" aria-hidden />
          {t('musafir.duaTitle', 'Your du‘ā is answered')}
        </h3>
        <p className="text-white/70 text-[11px] mt-0.5 mb-2">
          {t(
            'musafir.duaSub',
            'Use the journey: ask for your parents, your family, the ummah and your own heart.'
          )}
        </p>
        <RefQuote r={REF_DUA_ANSWERED} lang={lang} />
      </div>
    </div>
  );
}
