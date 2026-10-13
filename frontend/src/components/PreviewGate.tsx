import { useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import { CARD } from './bustanStyles.js';
import { SignInButtons } from './SignInSheet.js';
import { useAuthStore } from '../store/useAuthStore.js';

// U10: what a guest sees on a page built from their own record (analytics,
// Profile, Settings, the Quran habit...), in place of the old "Sign in
// required" lock card. Analytics pages show a clearly marked example chart;
// "See an example" opens the demo on this same page (Rayhanah's as a sister).

// Heights of the example bars (percent); the gold ones are the short days.
const EXAMPLE_BARS = [70, 100, 55, 85, 100, 40, 90];

function ExampleChart() {
  const { t } = useTranslation();
  return (
    <div className="relative rounded-control border border-brand-border bg-shade/20 p-4 pt-8">
      <span className="absolute top-2 right-2 rounded-full border border-brand-gold/40 bg-brand-gold/10 px-2 py-0.5 text-[11px] font-bold text-brand-gold">
        {t('signInGate.example')}
      </span>
      <p className="absolute top-2.5 left-4 text-xs text-white/70">
        {t('signInGate.exampleChart')}
      </p>
      <div className="flex items-end gap-2 h-24" aria-hidden="true">
        {EXAMPLE_BARS.map((h, i) => (
          <span
            key={i}
            className={`flex-1 rounded-t-md ${h < 60 ? 'bg-brand-gold/70' : 'bg-brand-emerald/80'}`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function PreviewGate() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const enterDemoMode = useAuthStore((s) => s.enterDemoMode);
  const analytics = pathname.endsWith('/analytics');
  const kind = analytics ? 'analytics' : 'page';
  // The onboarding page has nothing to show in a demo.
  const canPreview = pathname !== '/welcome';

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-8">
      <section
        className={`${CARD} p-6 max-w-sm w-full text-center`}
        aria-labelledby="preview-gate-title"
        data-testid="preview-gate"
      >
        {analytics ? (
          <ExampleChart />
        ) : (
          <span className="mx-auto w-14 h-14 rounded-full grid place-items-center border border-brand-emerald/30 bg-brand-emerald/10 text-brand-emerald">
            <ShieldCheckIcon className="w-7 h-7" aria-hidden="true" />
          </span>
        )}
        <h1 id="preview-gate-title" className="font-display text-xl font-bold text-white mt-5">
          {t(`signInGate.${kind}.title`)}
        </h1>
        <p className="text-white/75 text-sm leading-relaxed mt-2">{t(`signInGate.${kind}.desc`)}</p>
        <SignInButtons className="mt-5" />
        {canPreview && (
          <button
            type="button"
            className="mt-3 min-h-[44px] px-3 text-sm font-semibold text-brand-emerald underline underline-offset-2 hover:text-white transition-colors"
            onClick={() => enterDemoMode(pathname.startsWith('/cycle') ? 'female' : 'male')}
          >
            {t('signInGate.seeExample')}
          </button>
        )}
      </section>
    </div>
  );
}
