import { m as motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ClockIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { LeafIcon } from '../icons/IslamicIcons.js';
import type { Icon } from '../cycle/cycleIcons.js';
import { AiPanel, AiBadge, AiDisclaimer, AiFallbackNote, AiThinking } from './AiFlair.js';
import { usePatternInsights, type PatternFinding } from '../../hooks/useNaseeh.js';
import { useAuthStore } from '../../store/useAuthStore.js';

const KIND_ICON: Record<PatternFinding['kind'], Icon> = {
  strength: LeafIcon,
  timing: ClockIcon,
  attention: MagnifyingGlassIcon,
};

function KindIcon({ kind }: { kind: PatternFinding['kind'] }) {
  const Glyph = KIND_ICON[kind];
  return <Glyph aria-hidden className="w-4 h-4 mt-1 shrink-0 text-brand-gold" />;
}

/** "What I noticed": patterns worked out from the user's own logs. The numbers
 * are computed on the server; the AI may only re-word the top two sentences. */
export default function PatternInsightsCard() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const aiEnabled = useAuthStore((s) => s.aiEnabled);
  const { data, isPending, isError } = usePatternInsights();

  if (!user || !aiEnabled) return null;
  // A failed load has nothing useful to show; the rest of the page still works.
  if (isError) return null;

  const findings = data?.findings ?? [];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <AiPanel>
        <div className="p-4 space-y-3">
          <AiBadge label={t('naseehPatterns.badge', 'Naseeh · what I noticed')} />

          {isPending && (
            <AiThinking label={t('naseehPatterns.thinking', 'Looking through your logs…')} />
          )}

          {!isPending && findings.length === 0 && (
            <p className="text-white/75 text-sm leading-relaxed">
              {t(
                'naseehPatterns.empty',
                'Not enough history yet to spot a real pattern. Keep logging for a couple of weeks and what Naseeh notices will show up here.'
              )}
            </p>
          )}

          {findings.length > 0 && (
            <ul className="space-y-2.5">
              {findings.map((f) => (
                <li key={f.id} className="flex gap-2.5 items-start">
                  <KindIcon kind={f.kind} />
                  <p className="text-white/80 text-sm leading-relaxed">{f.text}</p>
                </li>
              ))}
            </ul>
          )}

          {findings.length > 0 && (
            <p className="text-white/55 text-[11px] leading-relaxed">
              {t(
                'naseehPatterns.basis',
                'Worked out from your last 90 days of prayer and 30 days of dhikr and Quran time. Every number comes from your own logs.'
              )}
            </p>
          )}
          {/* The findings are computed on the server; only their wording may be AI. */}
          {findings.length > 0 && !data?.ai ? (
            <AiFallbackNote feature="patterns" />
          ) : (
            <AiDisclaimer feature="patterns" />
          )}
        </div>
      </AiPanel>
    </motion.div>
  );
}
