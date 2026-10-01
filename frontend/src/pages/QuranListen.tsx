import { useTranslation } from 'react-i18next';
import { translateReference } from '../utils/localeReference.js';
import AnimatedBackground from '../components/AnimatedBackground.js';
import QuranTabNav from '../components/QuranTabNav.js';
import QuranAudioPlayer from '../components/QuranAudioPlayer.js';

/** Dedicated listening room — full-surah recitation with the sound controls. */
export default function QuranListen() {
  const { t, i18n } = useTranslation();
  return (
    <AnimatedBackground variant="dark">
      <h1 className="sr-only">{t('quranListen.title')}</h1>
      <div className="max-w-2xl mx-auto px-4 pt-3 pb-16 space-y-4">
        <QuranTabNav active="listen" />
        <QuranAudioPlayer />
        <p className="text-white/30 text-[11px] leading-relaxed px-1">
          🌸 {t('quranListen.listeningVirtue')} (
          <a
            className="underline"
            href="https://sunnah.com/bukhari:5049"
            target="_blank"
            rel="noreferrer"
          >
            {translateReference('Bukhārī 5049', i18n.language)}
          </a>
          ). {t('quranListen.listeningCounts')}
        </p>
      </div>
    </AnimatedBackground>
  );
}
