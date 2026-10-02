import React, { ReactNode } from 'react';
import { m as motion } from 'framer-motion';

type BackgroundVariant = 'default' | 'dark' | 'premium' | 'ocean' | 'sunset' | 'vibrant';

interface VariantColors {
  bg: string;
  orb1: string;
  orb2: string;
  orb3: string;
}

interface AnimatedBackgroundProps {
  children: ReactNode;
  variant?: BackgroundVariant;
}

const VARIANTS: Record<BackgroundVariant, VariantColors> = {
  default: {
    bg: 'from-brand-void to-brand-void via-brand-deep',
    orb1: 'from-brand-emerald/[0.07] to-brand-emerald-dim/5',
    orb2: 'from-brand-gold/5 to-brand-gold/[0.03]',
    orb3: 'from-brand-warm/[0.04] to-purple-800/[0.02]',
  },
  dark: {
    bg: 'from-brand-void to-brand-void via-brand-deep',
    orb1: 'from-brand-emerald/10 to-brand-info/[0.07]',
    orb2: 'from-brand-gold/[0.07] to-brand-gold/5',
    orb3: 'from-brand-warm/5 to-purple-800/[0.03]',
  },
  premium: {
    bg: 'from-brand-void to-brand-void via-brand-deep',
    orb1: 'from-brand-emerald/[0.07] to-brand-emerald-dim/5',
    orb2: 'from-brand-gold/5 to-brand-gold/[0.03]',
    orb3: 'from-brand-warm/[0.04] to-purple-800/[0.02]',
  },
  ocean: {
    bg: 'from-brand-void to-brand-void via-brand-deep',
    orb1: 'from-brand-emerald/[0.07] to-brand-info/[0.07]',
    orb2: 'from-brand-info/5 to-brand-emerald/[0.03]',
    orb3: 'from-brand-info/5 to-brand-info/[0.03]',
  },
  sunset: {
    bg: 'from-brand-void to-brand-void via-brand-deep',
    orb1: 'from-brand-warm/[0.07] to-red-700/5',
    orb2: 'from-brand-gold/[0.07] to-brand-gold/5',
    orb3: 'from-brand-warm/5 to-brand-pink/[0.03]',
  },
  vibrant: {
    bg: 'from-brand-void to-brand-void via-brand-deep',
    orb1: 'from-brand-emerald/10 to-brand-emerald/5',
    orb2: 'from-brand-warm/[0.07] to-brand-warm/[0.03]',
    orb3: 'from-brand-gold/5 to-brand-gold/[0.03]',
  },
};

export default function AnimatedBackground({
  children,
  variant = 'default',
}: AnimatedBackgroundProps) {
  const colors = VARIANTS[variant] ?? VARIANTS.default;

  return (
    // No overflow-hidden here — it breaks position:sticky on children.
    // Orbs are clipped inside their own overflow-hidden wrapper instead.
    <div className={`min-h-screen relative bg-gradient-to-br ${colors.bg}`}>
      {/* Orbs clipped to viewport — isolated overflow-hidden so sticky still works */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className={`absolute top-0 left-0 w-96 h-96 rounded-full bg-gradient-to-r ${colors.orb1} blur-3xl`}
          animate={{ x: [0, 20, 0], y: [0, 10, 0], scale: [1, 1.02, 1] }}
          transition={{ duration: 45, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className={`absolute bottom-0 right-0 w-96 h-96 rounded-full bg-gradient-to-r ${colors.orb2} blur-3xl`}
          animate={{ x: [0, -20, 0], y: [0, -10, 0], scale: [1, 1.03, 1] }}
          transition={{ duration: 50, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-gradient-to-r ${colors.orb3} blur-3xl`}
          animate={{ scale: [1, 1.04, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 70, repeat: Infinity, ease: 'linear' }}
        />
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      <div className="relative z-10">{children}</div>
    </div>
  );
}
