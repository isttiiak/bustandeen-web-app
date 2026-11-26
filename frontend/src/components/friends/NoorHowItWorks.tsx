import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import { BookOpenIcon, ChevronDownIcon, SparklesIcon } from '@heroicons/react/24/outline';
import {
  CrescentIcon,
  FlowerIcon,
  LeafIcon,
  MosqueIcon,
  TasbihIcon,
} from '../icons/IslamicIcons.js';
import { CARD, SECTION_TITLE } from '../bustanStyles.js';
import { useIsFemale } from '../../hooks/useCycle.js';
import { formatLocaleNumber } from '../../utils/localeDate.js';
import type { SvgIcon } from './friendsParts.js';

/** "What is Noor?": the collapsible explainer under the circle. */
export function NoorHowItWorks() {
  const { t } = useTranslation();
  const [howOpen, setHowOpen] = useState(false);
  // Cycle wording is only ever shown to sisters (the public Privacy page aside).
  const isFemale = useIsFemale();

  const noorParts: { Icon: SvgIcon; tone: string; points: number; text: string }[] = [
    {
      Icon: MosqueIcon,
      tone: 'text-brand-emerald',
      points: 50,
      text: t('friends.noorPrayersV2', 'Prayers: 10 for each of the five fard (kaza counts)'),
    },
    {
      Icon: TasbihIcon,
      tone: 'text-brand-emerald',
      points: 15,
      text: t('friends.noorZikrV2', "Dhikr: today's count against your own daily goal"),
    },
    {
      Icon: BookOpenIcon,
      tone: 'text-brand-info',
      points: 15,
      text: t('friends.noorQuranV2', 'Quran: reading or listening against your own daily goal'),
    },
    {
      Icon: LeafIcon,
      tone: 'text-brand-emerald',
      points: 10,
      text: t(
        'friends.noorSteady',
        'Steadiness: 1 for each day in a row you show up, up to 10, once you have done something today'
      ),
    },
    {
      Icon: CrescentIcon,
      tone: 'text-brand-gold',
      points: 10,
      text: t(
        'friends.noorExtras',
        'Extras, 5 each (best two): a completed fast, nafl prayer, ṣalawāt or istighfār'
      ),
    },
  ];

  return (
    <section className={`${CARD} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setHowOpen(!howOpen)}
        className="w-full px-5 py-4 flex items-center justify-between gap-2 text-left"
        aria-expanded={howOpen}
      >
        <span className={SECTION_TITLE}>
          <SparklesIcon className="w-5 h-5 text-brand-gold" />
          {t('friends.whatIsNoor')}
        </span>
        <ChevronDownIcon
          className={`w-5 h-5 text-white/70 transition-transform ${howOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence>
        {howOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-3 space-y-2.5 text-sm text-white/80 leading-relaxed border-t border-brand-border">
              <p>
                {t(
                  'friends.noorIntro',
                  'Your Noor starts at 0 every day and only ever goes up. Up to 100:'
                )}
              </p>
              <ul className="space-y-2">
                {noorParts.map(({ Icon, tone, points, text }) => (
                  <li key={text} className="flex items-start gap-2.5">
                    <Icon className={`w-5 h-5 shrink-0 ${tone}`} />
                    <span>
                      <b className="text-white tabular-nums">{formatLocaleNumber(points)}</b> {text}
                    </span>
                  </li>
                ))}
                {isFemale && (
                  <li className="flex items-start gap-2.5">
                    <FlowerIcon className="w-5 h-5 shrink-0 text-brand-pink" />
                    <span>
                      {t(
                        'friends.noorExcusedV2',
                        'Rayhanah days (for sisters): prayer and fasting are excused, not lost. Dhikr and Quran count for more, and Noor still reaches 100.'
                      )}
                    </span>
                  </li>
                )}
              </ul>
              <p>
                <b className="text-white">{t('friends.boardToday', 'Today')}</b>{' '}
                {t('friends.noorTodayDesc')}{' '}
                <b className="text-white">{t('friends.boardWeek', 'This week')}</b>{' '}
                {t(
                  'friends.noorWeekDesc',
                  '= your average daily Noor since Friday; a day with nothing counts 0.'
                )}{' '}
                <b className="text-white">{t('friends.noorAllTimeLabel')}</b>{' '}
                {t('friends.noorAllTimeDesc')}
              </p>
              <p>
                {t(
                  'friends.noorUsualDesc',
                  '"Above their usual" compares today with the average of their recent active days, so everyone races their own best.'
                )}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
