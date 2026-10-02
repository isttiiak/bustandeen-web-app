import { useTranslation } from 'react-i18next';
import { translateReference } from '../utils/localeReference.js';
import AnimatedBackground from '../components/AnimatedBackground.js';
import QuranTabNav from '../components/QuranTabNav.js';
import QuranAudioPlayer from '../components/QuranAudioPlayer.js';

/** Dedicated listening room: full-surah recitation with the sound controls. */
export default function QuranListen() {
  const { t, i18n } = useTranslation();
  return (
    <AnimatedBackground variant="dark">
      <h1 className="sr-only">{t('quranListen.title')}</h1>
      <div className="max-w-2xl mx-auto px-4 pt-3 pb-16 space-y-4">
        <QuranTabNav active="listen" />
        <QuranAudioPlayer />
        {/* Quran 7:204 (checked on quran.com). It was mis-cited as
            Bukhari 5049 before v5.92.0. */}
        <p className="text-white/60 text-xs leading-relaxed px-1">
          {t('quranListen.listeningVirtue')} (
          <a className="underline" href="https://quran.com/7/204" target="_blank" rel="noreferrer">
            {translateReference('Quran 7:204', i18n.language)}
          </a>
          ). {t('quranListen.listeningCounts')}
        </p>
      </div>
    </AnimatedBackground>
  );
}
