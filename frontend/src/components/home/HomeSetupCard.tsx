import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { LeafIcon } from '../icons/IslamicIcons.js';
import type { HomeState } from './useHomeData.js';

/** The first-run "Make Bustandeen yours" card for accounts that have not set up. */
export function HomeSetupCard({
  setupMode,
  dismissSetup,
}: Pick<HomeState, 'setupMode' | 'dismissSetup'>) {
  const { t } = useTranslation();
  return (
    <>
      {setupMode === 'card' && (
        <section
          className="mb-5 rounded-card border border-brand-emerald/30 bg-brand-deep shadow-elev-2 p-4"
          aria-labelledby="home-setup-title"
          data-testid="home-setup-card"
        >
          <div className="flex items-start gap-3">
            <LeafIcon className="w-6 h-6 shrink-0 text-brand-emerald mt-0.5" />
            <div className="min-w-0 flex-1">
              <h2 id="home-setup-title" className="font-display text-white font-semibold text-base">
                {t('home.setupTitle', 'Make Bustandeen yours')}
              </h2>
              <p className="text-white/70 text-xs mt-1 leading-relaxed">
                {t(
                  'home.setupDetail',
                  'Your prayer times, your madhab and the habits you want to grow first. About a minute.'
                )}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Link
                  to="/welcome"
                  className="btn-solid inline-flex items-center justify-center rounded-control px-4 py-2 min-h-[44px] text-sm font-bold text-on-color bg-brand-emerald-dim hover:brightness-110 shadow-elev-1"
                >
                  {t('home.setupStart', 'Set up')}
                </Link>
                <button
                  onClick={dismissSetup}
                  className="px-3 min-h-[44px] text-white/70 hover:text-white text-sm underline underline-offset-2"
                >
                  {t('home.setupDismiss', 'No thanks')}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
