import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  useSalatDebt,
  useOwedKazaUnits,
  useAdjustSalatDebt,
  type PrayerId,
} from '../hooks/useSalatLog.js';
import { translateSalatName } from '../utils/prayerTimes.js';
import { translateReference } from '../utils/localeReference.js';
import { formatLocaleDate, formatLocaleNumber } from '../utils/localeDate.js';
import { celebrateSmall } from '../utils/celebrate.js';
import { getTrackingDay } from '../utils/trackingDay.js';
import {
  useMusafir,
  getMusafirHistory,
  wasTravelPrayer,
  travelKazaRakat,
  getTravelKazaRule,
  setTravelKazaRule,
  isQasrPrayer,
  REF_KAZA_WHEN_REMEMBERED,
  REF_KAZA_MUSLIM,
  REF_KAZA_AS_EVERY_DAY,
  REF_ESTABLISH_FOR_REMEMBRANCE,
  type TravelKazaRule,
} from '../utils/musafir.js';

const PRAYER_ICON: Record<PrayerId, string> = {
  fajr: '🌅',
  dhuhr: '☀️',
  asr: '🌤️',
  maghrib: '🌆',
  isha: '🌙',
};
const INITIAL_ROWS = 6;

/**
 * Travel kaza: the owed missed prayers that fell on a journey, each paid back
 * one specific day at a time with the right number of rak'ahs. They are the
 * same units the main Kaza Debt counter holds (nothing is double-counted);
 * this card only picks out the travel ones and says how to pray them.
 * Renders nothing when no owed prayer was a travel prayer.
 */
export default function TravelKazaCard() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const musafir = useMusafir();
  const history = getMusafirHistory();
  const hasJourneys = !!musafir || history.length > 0;
  const { data: debt } = useSalatDebt();
  const totalOwed = debt?.totalOwed ?? 0;
  const { data: units } = useOwedKazaUnits(totalOwed, hasJourneys && totalOwed > 0);
  const adjust = useAdjustSalatDebt();
  const [rule, setRule] = useState<TravelKazaRule>(() => getTravelKazaRule());
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);

  const travelling = !!musafir;
  const travelUnits = (units ?? []).filter((u) =>
    wasTravelPrayer(musafir, history, u.missedDate, u.prayer)
  );

  if (!hasJourneys || travelUnits.length === 0) return null;

  const shortenedCount = travelUnits.filter((u) => isQasrPrayer(u.prayer)).length;
  const rows = showAll ? travelUnits : travelUnits.slice(0, INITIAL_ROWS);
  const fmtDate = (d: string) =>
    formatLocaleDate(new Date(`${d}T12:00:00`), {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

  const chooseRule = (r: TravelKazaRule) => {
    setRule(r);
    setTravelKazaRule(r);
  };

  const madeUp = (prayer: PrayerId, missedDate: string) => {
    const key = `${prayer}:${missedDate}`;
    setPaying(key);
    adjust.mutate(
      { prayer, delta: -1, date: getTrackingDay(), missedDate },
      {
        onSuccess: () => {
          celebrateSmall();
          toast.success(t('travelKaza.paid', 'Made up. May Allah accept it.'), {
            icon: '🤲',
            id: 'travel-kaza-paid',
          });
        },
        onError: () =>
          toast.error(t('travelKaza.payFailed', 'Could not save. Please try again.'), {
            id: 'travel-kaza-paid',
          }),
        onSettled: () => setPaying(null),
      }
    );
  };

  const refs = [
    REF_KAZA_WHEN_REMEMBERED,
    REF_KAZA_MUSLIM,
    REF_KAZA_AS_EVERY_DAY,
    REF_ESTABLISH_FOR_REMEMBRANCE,
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      layout
      className="rounded-2xl border border-brand-info/40 bg-brand-info/[0.08] overflow-hidden"
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full p-3.5 flex items-center gap-3 text-left"
      >
        <span className="text-2xl shrink-0">🧳</span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-sm leading-none text-brand-info">
            {t('travelKaza.title', 'Travel kaza')}
          </span>
          <span className="block text-white/50 text-xs mt-1 leading-snug">
            {t('travelKaza.summary', '{{count}} missed on a journey · made up as travel prayers', {
              count: travelUnits.length,
            })}
          </span>
        </span>
        <span className="text-white/30 text-xs shrink-0">
          {expanded ? t('salatTracker.less', '▲ Less') : t('salatTracker.details', '▾ Details')}
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-brand-info/15"
          >
            <div className="p-3.5 space-y-3">
              {/* How many rak'ahs — the one real choice here */}
              {shortenedCount > 0 &&
                (travelling ? (
                  <p className="rounded-xl bg-brand-info/10 border border-brand-info/25 px-3 py-2 text-xs text-white/70 leading-relaxed">
                    {t(
                      'travelKaza.stillTravelling',
                      'You are still travelling, so a missed Ẓuhr, ʿAṣr or ʿIshāʾ is made up as 2 rakʿahs. Scholars agree on this.'
                    )}
                  </p>
                ) : (
                  <div>
                    <p className="text-white/60 text-xs font-bold">
                      {t(
                        'travelKaza.ruleLabel',
                        'Now that you are home, make up Ẓuhr, ʿAṣr and ʿIshāʾ as:'
                      )}
                    </p>
                    <div className="grid grid-cols-2 gap-2 mt-1.5">
                      {(
                        [
                          [
                            'short',
                            t('travelKaza.ruleShort', '2 rakʿahs'),
                            t('travelKaza.ruleShortWho', 'as missed · Ḥanafī, Mālikī'),
                          ],
                          [
                            'full',
                            t('travelKaza.ruleFull', '4 rakʿahs'),
                            t('travelKaza.ruleFullWho', 'in full · Shāfiʿī, Ḥanbalī'),
                          ],
                        ] as const
                      ).map(([id, label, who]) => (
                        <button
                          key={id}
                          onClick={() => chooseRule(id)}
                          aria-pressed={rule === id}
                          className={`text-left rounded-xl border px-3 py-2 transition-all ${
                            rule === id
                              ? 'bg-brand-info/20 border-brand-info/60'
                              : 'bg-brand-deep border-brand-border hover:border-white/25'
                          }`}
                        >
                          <span
                            className={`block text-sm font-black ${rule === id ? 'text-brand-info' : 'text-white/75'}`}
                          >
                            {label}
                          </span>
                          <span className="block text-white/40 text-[10px] mt-0.5">{who}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

              {/* The owed travel prayers, newest first */}
              <ul className="space-y-1.5">
                {rows.map((u) => {
                  const key = `${u.prayer}:${u.missedDate}`;
                  const rakat = travelKazaRakat(u.prayer, travelling, rule);
                  const shortened = isQasrPrayer(u.prayer) && rakat === 2;
                  return (
                    <li
                      key={key}
                      className="flex items-center gap-2.5 rounded-xl bg-black/20 border border-white/5 px-3 py-2"
                    >
                      <span className="text-lg shrink-0">{PRAYER_ICON[u.prayer]}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-white/85 text-sm font-bold leading-tight">
                          {translateSalatName(u.prayer, u.prayer, t)}
                        </span>
                        <span className="block text-white/35 text-[11px]">
                          {fmtDate(u.missedDate)}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap ${
                          shortened
                            ? 'bg-brand-info/20 text-brand-info'
                            : 'bg-white/10 text-white/50'
                        }`}
                      >
                        {shortened ? '✂️ ' : ''}
                        {t('travelKaza.rakat', '{{n}} rakʿah', { n: formatLocaleNumber(rakat) })}
                      </span>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        disabled={paying !== null}
                        onClick={() => madeUp(u.prayer, u.missedDate)}
                        className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold bg-brand-emerald/15 border border-brand-emerald/50 text-brand-emerald hover:bg-brand-emerald/25 disabled:opacity-40"
                      >
                        {paying === key ? '…' : t('travelKaza.madeUp', '✓ Made up')}
                      </motion.button>
                    </li>
                  );
                })}
              </ul>
              {travelUnits.length > INITIAL_ROWS && (
                <button
                  onClick={() => setShowAll((v) => !v)}
                  className="text-brand-info/70 hover:text-brand-info text-xs underline underline-offset-2"
                >
                  {showAll
                    ? t('travelKaza.showLess', 'Show fewer')
                    : t('travelKaza.showAll', 'Show all {{count}}', { count: travelUnits.length })}
                </button>
              )}

              <p className="text-white/35 text-[11px] leading-relaxed">
                {t(
                  'travelKaza.fromHomeNote',
                  'Only prayers missed on a journey are listed here, and each is also part of the Kaza Debt total above. Prayers owed from home stay in full (4 rakʿahs), even when made up on a journey.'
                )}
              </p>

              {/* Why — the evidence, and an honest note on where it comes from */}
              <div className="border-t border-white/10 pt-2.5">
                <button
                  onClick={() => setShowWhy((v) => !v)}
                  aria-expanded={showWhy}
                  className="text-white/50 hover:text-white/80 text-xs font-bold"
                >
                  📖 {t('travelKaza.why', 'Why? The evidence')} {showWhy ? '▲' : '▼'}
                </button>
                <AnimatePresence>
                  {showWhy && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="text-white/55 text-xs leading-relaxed mt-2">
                        {t(
                          'travelKaza.whyNote',
                          'No hadith names this exact case. The rule every school builds on: a missed prayer is prayed when remembered, as it was owed. On a journey, Fajr missed in sleep was prayed “just as he did every day”. So on the road it is 2; at home the schools differ, as above.'
                        )}
                      </p>
                      <div className="space-y-2.5 mt-2.5">
                        {refs.map((r) => (
                          <div key={r.source}>
                            <p className="text-white/70 text-xs leading-relaxed">
                              {r.text.startsWith('“') ? '' : '“'}
                              {lang === 'bn' ? r.textBn : r.text}
                              {r.text.startsWith('“') ? '' : '”'}
                            </p>
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-block mt-0.5 text-[11px] text-brand-info/60 hover:text-brand-info underline underline-offset-2"
                            >
                              {translateReference(r.source, lang)}
                              {r.grade !== 'Quran' && ` · ${translateReference(r.grade, lang)}`} ↗
                            </a>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
