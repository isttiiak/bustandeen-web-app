import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { CARD } from '../bustanStyles.js';

/** A row of the "AI usage and privacy" panel on /naseeh (AiPrivacyPanel). */
export type AiFeature = 'quickLog' | 'summary' | 'patterns' | 'kaza' | 'plan' | 'chat' | 'coaching';

/** Opens the privacy panel at this feature's row: exactly what it sends. */
export function AiSendsLink({
  feature,
  onNavigate,
}: {
  feature: AiFeature;
  /** e.g. close the modal the link sits in */
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Link
      to={`/naseeh#ai-sends-${feature}`}
      onClick={onNavigate}
      className="text-white/60 hover:text-white underline underline-offset-2 text-[10px] whitespace-nowrap"
    >
      {t('aiFlair.whatIsSent', 'What is sent?')}
    </Link>
  );
}

/** Replaces <AiDisclaimer/> when a card shows its plain, non-AI version
 * (the AI request failed or the daily limit was reached). */
export function AiFallbackNote({ feature }: { feature: AiFeature }) {
  const { t } = useTranslation();
  return (
    <p className="text-white/55 text-[11px] leading-relaxed mt-2">
      {t(
        'aiFlair.fallbackNote',
        'Naseeh could not reach the AI just now, so this is a plain note worked out from your own numbers. No AI was used.'
      )}{' '}
      <AiSendsLink feature={feature} />
    </p>
  );
}

/**
 * The Naseeh look (T3.2 Bustan Arch): AI surfaces are ordinary theme cards
 * marked by a calm sage badge with a sparkles icon. No aurora, glow or endless
 * motion. Every AI output carries <AiDisclaimer/>, never a source of evidence.
 */

/** The badge that marks a surface as AI. */
export function AiBadge({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold text-brand-emerald bg-brand-emerald/10 border border-brand-emerald/30">
      <SparklesIcon aria-hidden className="w-3.5 h-3.5" />
      <span>{label ?? t('aiFlair.badgeLabel', 'Naseeh · AI companion')}</span>
    </span>
  );
}

/** "Thinking" loader: three dots that pulse while the request is pending
 * (CSS, stopped under reduced motion). */
export function AiThinking({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-6" role="status">
      <div className="flex items-center gap-2" aria-hidden>
        {['bg-brand-emerald', 'bg-brand-gold', 'bg-brand-info'].map((c, i) => (
          <span
            key={c}
            className={`w-2.5 h-2.5 rounded-full ${c} animate-pulse motion-reduce:animate-none`}
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
      <p className="text-white/60 text-xs font-semibold tracking-wide">
        {label ?? t('aiFlair.thinkingLabel', 'Naseeh is reflecting…')}
      </p>
    </div>
  );
}

/** An AI card: the shared theme card. */
export function AiPanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`${CARD} ${className}`}>{children}</div>;
}

/** The non-negotiable label under every AI output, with a link to what the
 * feature sends. */
export function AiDisclaimer({ feature }: { feature?: AiFeature }) {
  const { t } = useTranslation();
  return (
    <p className="text-white/55 text-[11px] leading-relaxed mt-2 flex items-start gap-1">
      <SparklesIcon aria-hidden className="w-3 h-3 mt-0.5 shrink-0 text-brand-emerald" />
      <span>
        {t('aiFlair.disclaimerPrefix', 'AI-generated encouragement, a companion,')}{' '}
        <b className="text-white/50">
          {t('aiFlair.disclaimerBold', 'never a source of religious evidence')}
        </b>
        .{' '}
        {t(
          'aiFlair.disclaimerSuffix',
          "For rulings or proofs, see the app's verified references or ask a qualified scholar."
        )}
        {feature && (
          <>
            {' '}
            <AiSendsLink feature={feature} />
          </>
        )}
      </span>
    </p>
  );
}
