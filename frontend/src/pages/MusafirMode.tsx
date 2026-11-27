import { useTranslation } from 'react-i18next';
import { HomeIcon } from '@heroicons/react/24/outline';
import AnimatedBackground from '../components/AnimatedBackground.js';
import ConfirmDialog from '../components/ConfirmDialog.js';
import Seo from '../components/Seo.js';
import { CARD, SECTION_TITLE } from '../components/bustanStyles.js';
import { deleteMusafirJourney, REF_HASTEN_HOME, REF_RETURN_MASJID } from '../utils/musafir.js';
import { RefQuote } from '../components/musafir/MusafirBits.js';
import { useMusafirPage } from '../components/musafir/useMusafirPage.js';
import MusafirHero from '../components/musafir/MusafirHero.js';
import MusafirReturned from '../components/musafir/MusafirReturned.js';
import MusafirForm from '../components/musafir/MusafirForm.js';
import MusafirPrayers from '../components/musafir/MusafirPrayers.js';
import MusafirRewards from '../components/musafir/MusafirRewards.js';
import MusafirDuas from '../components/musafir/MusafirDuas.js';
import MusafirRulings from '../components/musafir/MusafirRulings.js';
import MusafirSchools from '../components/musafir/MusafirSchools.js';
import MusafirHistory from '../components/musafir/MusafirHistory.js';

export default function MusafirMode() {
  const { t } = useTranslation();
  const page = useMusafirPage();
  const { lang, confirmEnd, setConfirmEnd, deleteIdx, setDeleteIdx, finishJourney } = page;

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('musafir.seoTitle', 'Musafir Mode: Salah & Sunnah for Travellers')}
        description={t(
          'musafir.seoDescription',
          'Travelling? Shorten and join your prayers the Sunnah way: qasr, jam‘, fasting, wiping over socks and the travel du‘as, each with its authentic hadith reference.'
        )}
        path="/musafir"
      />
      <h1 className="sr-only">{t('musafir.title', 'Musafir mode')}</h1>
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-16 space-y-4">
        {/* Arch hero: the journey (or the invitation to start one) and its actions */}
        <MusafirHero page={page} />

        {/* Welcome home */}
        <MusafirReturned page={page} />

        {/* Setup / edit form */}
        <MusafirForm page={page} />

        {/* Today's prayers as a traveller */}
        <MusafirPrayers page={page} />

        {/* Motivation: the traveller's two gifts */}
        <MusafirRewards page={page} />

        {/* Journey du'as checklist */}
        <MusafirDuas page={page} />

        {/* The concessions, with evidence */}
        <MusafirRulings page={page} />

        {/* Madhab comparison */}
        <MusafirSchools page={page} />

        {/* Coming home */}
        <section className={`${CARD} p-4 sm:p-5 space-y-3`}>
          <h3 className={SECTION_TITLE}>
            <HomeIcon className="w-5 h-5 text-brand-emerald" aria-hidden />
            {t('musafir.homeTitle', 'When the work is done, go home')}
          </h3>
          <RefQuote r={REF_HASTEN_HOME} lang={lang} />
          <RefQuote r={REF_RETURN_MASJID} lang={lang} />
        </section>

        <p className="text-white/60 text-[11px] leading-relaxed px-1">
          {t(
            'musafir.disclaimer',
            'Every reference links to its source. Details (exact distance, socks, special cases like a job that keeps you travelling) differ between scholars: when in doubt, ask a scholar you trust. Your journey is saved to your account settings and stays private.'
          )}
        </p>

        {/* Travel history: the current journey and every past one */}
        <MusafirHistory page={page} />
      </div>

      <ConfirmDialog
        open={deleteIdx !== null}
        title={t('musafir.historyDeleteTitle', 'Remove this journey?')}
        message={t(
          'musafir.historyDeleteMessage',
          'Its days will no longer count as travel days, so missed prayers from them move out of Travel kaza. Your prayer logs are not changed.'
        )}
        confirmLabel={t('musafir.historyDeleteConfirm', 'Remove')}
        onConfirm={() => {
          if (deleteIdx !== null) deleteMusafirJourney(deleteIdx);
          setDeleteIdx(null);
        }}
        onCancel={() => setDeleteIdx(null)}
      />

      <ConfirmDialog
        open={confirmEnd}
        title={t('musafir.endTitle', 'Back home?')}
        message={t(
          'musafir.endMessage',
          'Musafir mode turns off and your prayers return to their full rak’ahs. Your prayers already logged on the journey keep their qaṣr marks.'
        )}
        confirmLabel={t('musafir.endConfirm', 'Yes, I’m home')}
        icon={<HomeIcon className="w-6 h-6" aria-hidden />}
        onConfirm={finishJourney}
        onCancel={() => setConfirmEnd(false)}
      />
    </AnimatedBackground>
  );
}
