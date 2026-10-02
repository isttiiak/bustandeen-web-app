import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import AnimatedBackground from './AnimatedBackground.js';

interface Props {
  emoji: string;
  title: string;
  desc: string;
  backTo: string;
  backLabel: string;
  /** Tab nav rendered at the top (already translated labels). */
  tabs?: ReactNode;
}

/**
 * Full-page sign-in gate shown to demo users who navigate to an analytics or
 * personal-data page. Never renders the page body — no crashes from missing data.
 */
export default function DemoSignInGate({ emoji, title, desc, backTo, backLabel, tabs }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <AnimatedBackground variant="dark">
      {tabs && (
        <div className="px-4 pt-3">
          <div className="max-w-2xl mx-auto">{tabs}</div>
        </div>
      )}
      <div className="min-h-[60vh] grid place-items-center px-4 text-center">
        <div className="space-y-4 max-w-xs">
          <div className="text-5xl">{emoji}</div>
          <p className="text-white font-black text-lg">{title}</p>
          <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
          <div className="flex flex-col gap-2.5">
            <button
              className="btn bg-brand-emerald-dim hover:bg-brand-emerald-dim hover:brightness-90 text-white border-0 w-full"
              onClick={() => navigate('/signup')}
            >
              {t('app.createFreeAccount', 'Create Free Account')}
            </button>
            <button
              className="btn btn-ghost text-brand-emerald border border-brand-emerald/30 w-full"
              onClick={() => navigate('/login')}
            >
              {t('common.signIn', 'Sign In')}
            </button>
            <button
              className="text-white/30 text-xs hover:text-white/60"
              onClick={() => navigate(backTo)}
            >
              ← {backLabel}
            </button>
          </div>
        </div>
      </div>
    </AnimatedBackground>
  );
}
