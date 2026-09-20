import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../store/useAuthStore.js';
import { useMyZikrRequests, useAckZikrRequest } from '../hooks/useZikrRequests.js';

/**
 * One-time "we added it" card for a zikr/dua suggestion an admin approved —
 * dismissing it marks the request acknowledged server-side so it never shows
 * again (see ZikrRequest.userAcknowledged). Reuses the request doc itself
 * rather than a separate generic notifications system.
 */
export default function ZikrRequestApprovedNotice() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { data: requests } = useMyZikrRequests();
  const ack = useAckZikrRequest();

  if (!user) return null;
  const unseen = requests?.find((r) => r.status === 'approved' && !r.userAcknowledged);
  if (!unseen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="rounded-2xl border border-brand-emerald/30 bg-brand-emerald/10 px-4 py-3 flex items-start gap-3"
      >
        <span className="text-xl shrink-0">🌱</span>
        <p className="flex-1 min-w-0 text-sm text-white/85 leading-relaxed">
          {t(
            'zikr.requestApprovedNotice',
            'JazakAllahu khayran — your suggestion "{{name}}" is now in the Zikr Library for everyone to benefit from!',
            { name: unseen.name }
          )}
        </p>
        <button
          onClick={() => ack.mutate(unseen._id)}
          disabled={ack.isPending}
          aria-label={t('zikr.dismiss', 'Dismiss')}
          className="shrink-0 w-6 h-6 rounded-full grid place-items-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
