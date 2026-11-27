import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { CARD } from '../bustanStyles.js';
import { BTN_PINK, formatDay } from './rayhanahShared.js';
import { type RayhanahPage } from './useRayhanahPage.js';

export default function RayhanahLastEnded({
  page,
  lastEnded,
}: {
  page: RayhanahPage;
  lastEnded: NonNullable<RayhanahPage['lastEnded']>;
}) {
  const { t } = useTranslation();
  const { editCycle } = page;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${CARD} border-brand-pink/40 p-4 flex flex-col sm:flex-row sm:items-center gap-3`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-brand-pink text-sm font-bold">
          {t('rayhanah.endedTooEarly', 'Ended too early?')}
        </p>
        <p className="text-white/75 text-xs mt-0.5 leading-relaxed">
          {t(
            'rayhanah.endedTooEarlyDesc',
            'If the flow returned after you marked {{date}} as the end, you can reopen that cycle. All your daily notes stay exactly where they are.',
            { date: formatDay(lastEnded.endDate!) }
          )}
        </p>
      </div>
      <button
        className={`${BTN_PINK} shrink-0`}
        disabled={editCycle.isPending}
        onClick={() =>
          editCycle.mutate(
            { logId: lastEnded._id, endDate: null },
            {
              onSuccess: () =>
                toast.success(t('rayhanah.cycleReopenedToast', 'Cycle reopened. Take your time.'), {
                  id: 'cycle-reopen',
                }),
            }
          )
        }
      >
        {t('rayhanah.notDoneYet', "I'm not done yet")}
      </button>
    </motion.section>
  );
}
