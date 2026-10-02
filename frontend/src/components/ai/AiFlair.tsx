import { m as motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

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
      className="text-white/45 hover:text-white/70 underline underline-offset-2 text-[10px] whitespace-nowrap"
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
    <p className="text-white/30 text-[10px] leading-relaxed mt-2">
      {t(
        'aiFlair.fallbackNote',
        'Naseeh could not reach the AI just now, so this is a plain note worked out from your own numbers. No AI was used.'
      )}{' '}
      <AiSendsLink feature={feature} />
    </p>
  );
}

/**
 * The distinct "AI feel" — deliberately more colorful and alive than the calm
 * emerald app chrome, so an AI surface reads as generative at a glance:
 * a slowly rotating aurora gradient, prismatic dots, and a shimmering label.
 * Every AI output carries <AiDisclaimer/> — never a source of evidence.
 */

/** A colorful pill/badge that marks a surface as AI. */
export function AiBadge({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <span className="relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black text-white overflow-hidden">
      <motion.span
        aria-hidden
        className="absolute inset-0 opacity-90"
        style={{
          background: 'linear-gradient(90deg,#7a9e6e,#06b6d4,#a855f7,#ec4899,#c9a96e,#7a9e6e)',
          backgroundSize: '300% 100%',
        }}
        animate={{ backgroundPosition: ['0% 50%', '300% 50%'] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
      />
      <span className="relative">✨</span>
      <span className="relative">{label ?? t('aiFlair.badgeLabel', 'Naseeh · AI companion')}</span>
    </span>
  );
}

/** Prismatic "thinking" loader — colorful pulsing dots over a soft aurora. */
export function AiThinking({ label }: { label?: string }) {
  const { t } = useTranslation();
  const colors = ['#7a9e6e', '#5a9e8e', '#c4825a', '#c4825a', '#c9a96e'];
  return (
    <div className="relative flex flex-col items-center justify-center gap-3 py-6">
      <motion.div
        aria-hidden
        className="absolute w-32 h-32 rounded-full blur-2xl opacity-40"
        style={{ background: 'radial-gradient(circle, #a855f7, #06b6d4, transparent 70%)' }}
        animate={{ scale: [1, 1.06, 1], opacity: [0.25, 0.35, 0.25] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="relative flex items-center gap-2">
        {colors.map((c, i) => (
          <motion.span
            key={i}
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: c, boxShadow: `0 0 10px ${c}` }}
            animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }}
          />
        ))}
      </div>
      <p className="relative text-white/50 text-xs font-semibold tracking-wide">
        {label ?? t('aiFlair.thinkingLabel', 'Naseeh is reflecting…')}
      </p>
    </div>
  );
}

/** A card with a FULL gradient border whose colors slowly traverse the whole
 * perimeter (Istiak: no partial "running" segment — the complete border stays
 * visible at all times and the gradient drifts along it, calm and slow). The
 * interior is fully opaque so nothing moves behind the text. */
export function AiPanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-3xl p-[2px] overflow-hidden ${className}`}>
      <motion.div
        aria-hidden
        className="absolute inset-0 rounded-3xl"
        style={{
          background:
            'linear-gradient(100deg,#0f766e,#0e7490,#4f46e5,#7e22ce,#be185d,#b45309,#0f766e)',
          backgroundSize: '300% 100%',
        }}
        animate={{ backgroundPosition: ['0% 50%', '300% 50%'] }}
        transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
      />
      <div className="relative rounded-[calc(1.5rem-2px)] bg-brand-deep">{children}</div>
    </div>
  );
}

/** The non-negotiable label under every AI output, with a link to what the
 * feature sends. */
export function AiDisclaimer({ feature }: { feature?: AiFeature }) {
  const { t } = useTranslation();
  return (
    <p className="text-white/30 text-[10px] leading-relaxed mt-2 flex items-start gap-1">
      <span aria-hidden>✨</span>
      <span>
        {t('aiFlair.disclaimerPrefix', 'AI-generated encouragement — a companion,')}{' '}
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
