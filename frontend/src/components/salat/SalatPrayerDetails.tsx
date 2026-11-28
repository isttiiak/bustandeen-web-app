import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import {
  BookOpenIcon,
  BriefcaseIcon,
  ClockIcon,
  LinkIcon,
  ScissorsIcon,
} from '@heroicons/react/24/outline';
import { MosqueIcon, TasbihIcon } from '../icons/IslamicIcons.js';
import {
  MISSED_REASONS,
  type PrayerId,
  type PrayerStatus,
  type PrayerLocation,
  type MissedReason,
  type SalatLog,
} from '../../hooks/useSalatLog.js';
import { translateSalatName } from '../../utils/prayerTimes.js';
import { recitationsFor, recitationHref } from '../../utils/postSalatQuran.js';
import { isQasrPrayer, jamPartner } from '../../utils/musafir.js';
import { LOCATION_TAGS } from './salatParts.js';

/** A prayer's drawers: where and how it was prayed and the after-salat tags; or the optional missed reason. */
export default function SalatPrayerDetails({
  hasSubTag,
  isExpanded,
  status,
  isJumuah,
  entry,
  prayerId,
  rowTravel,
  isQasrRow,
  isCivilFriday,
  isFridayToday,
  sisterFriday,
  canJoin,
  jamWith,
  log,
  normaliseStatus,
  locationTagText,
  handleSubTag,
  handleMissedReason,
  setQasr,
  toggleJoined,
}: {
  hasSubTag: boolean;
  isExpanded: boolean;
  status: PrayerStatus;
  isJumuah: boolean;
  entry: SalatLog['prayers'][PrayerId] | undefined;
  prayerId: PrayerId;
  rowTravel: boolean;
  isQasrRow: boolean;
  isCivilFriday: boolean;
  isFridayToday: boolean;
  /** A sister's Friday Ẓuhr: Jumu'ah is optional for her, so it is an ordinary Ẓuhr. */
  sisterFriday: boolean;
  canJoin: (p: PrayerId) => boolean;
  jamWith: ReturnType<typeof jamPartner>;
  log: SalatLog | undefined;
  normaliseStatus: (raw: string | undefined) => PrayerStatus;
  locationTagText: (value: PrayerLocation) => { label: string; note: string };
  handleSubTag: (
    prayer: PrayerId,
    type: 'location' | 'tasbeeh' | 'ayatulKursi',
    value: PrayerLocation | boolean
  ) => void;
  handleMissedReason: (prayer: PrayerId, reason: MissedReason) => void;
  setQasr: (prayer: PrayerId, qasr: boolean) => void;
  toggleJoined: (second: PrayerId) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <>
      {/* Sub-tags row (only for completed/kaza) */}
      <AnimatePresence>
        {hasSubTag && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden border-t border-brand-border/70"
          >
            <div className="px-3 py-2.5 space-y-2">
              {/* Location tags — only for completed (kaza is always prayed alone).
                                Friday's Dhuhr (Jumu'ah) is skipped entirely: it's only valid as a
                                mosque congregation prayer, so the location is set automatically
                                instead of asking the user to pick it. */}
              {status === 'completed' && isJumuah && (
                <p className="flex items-start gap-1.5 text-brand-emerald text-[11px] sm:text-xs">
                  <MosqueIcon className="w-3.5 h-3.5 mt-px shrink-0" />
                  {t(
                    'salatTracker.jumuahAutoMosque',
                    "Marked at the mosque automatically. Jumu'ah is only valid in congregation."
                  )}
                </p>
              )}
              {status === 'completed' && sisterFriday && (
                <p className="flex items-start gap-1.5 text-white/60 text-[11px] sm:text-xs">
                  <MosqueIcon className="w-3.5 h-3.5 mt-px shrink-0" aria-hidden="true" />
                  {t(
                    'salatTracker.sisterJumuahHint',
                    "Prayed Jumu'ah with the imam at the mosque? Choose At Mosque."
                  )}
                </p>
              )}
              {status === 'completed' && !isJumuah && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-white/60 text-[11px] sm:text-xs">
                    {t('salatTracker.whereLabel', 'Where:')}
                  </span>
                  {LOCATION_TAGS.map((tag) => {
                    const { label, note } = locationTagText(tag.value);
                    return (
                      <motion.button
                        key={tag.value}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleSubTag(prayerId, 'location', tag.value)}
                        aria-pressed={
                          entry?.location === tag.value ||
                          (!entry?.location && tag.value === 'home')
                        }
                        className={`flex items-center gap-1 px-2 py-1 sm:px-2.5 rounded-control text-[11px] sm:text-xs font-semibold border transition-colors ${
                          entry?.location === tag.value ||
                          (!entry?.location && tag.value === 'home')
                            ? 'bg-brand-emerald/20 border-brand-emerald/60 text-brand-emerald'
                            : 'bg-brand-deep border-brand-border text-white/60 hover:text-white'
                        }`}
                      >
                        <tag.Icon className="w-3.5 h-3.5" aria-hidden="true" />
                        {label}
                        <span className="text-white/50 text-xs hidden sm:inline">({note})</span>
                      </motion.button>
                    );
                  })}
                </div>
              )}
              {status === 'kaza' && isJumuah && (
                <p className="flex items-start gap-1.5 text-brand-gold text-[11px] sm:text-xs">
                  <ClockIcon className="w-3.5 h-3.5 mt-px shrink-0" aria-hidden="true" />
                  {t(
                    'salatTracker.jumuahKazaAlone',
                    "Made up as an ordinary Dhuhr, prayed alone. Jumu'ah itself has no kaza."
                  )}
                </p>
              )}
              {/* Musafir: 2 (qaṣr) or in full — behind a local
                                imam, or Jumu'ah on a Friday. */}
              {(rowTravel || entry?.qasr !== undefined) && isQasrPrayer(prayerId) && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-white/60 text-[11px] sm:text-xs">
                    <BriefcaseIcon className="w-3.5 h-3.5" aria-hidden="true" />
                    {t('salatTracker.prayedAs', 'Prayed as:')}
                  </span>
                  {[true, false].map((q) => {
                    const on = q ? isQasrRow : !isQasrRow;
                    const label = q
                      ? t('salatTracker.asQasr', '2 · qaṣr')
                      : prayerId === 'dhuhr' && isCivilFriday
                        ? t('salatTracker.asJumuah', "Jumu'ah")
                        : t('salatTracker.asFull', '4 · behind a local imam');
                    const Icon = q
                      ? ScissorsIcon
                      : prayerId === 'dhuhr' && isCivilFriday
                        ? MosqueIcon
                        : null;
                    return (
                      <motion.button
                        key={String(q)}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => !on && setQasr(prayerId, q)}
                        aria-pressed={on}
                        className={`flex items-center gap-1 px-2 py-1 sm:px-2.5 rounded-control text-[11px] sm:text-xs font-semibold border transition-colors ${
                          on
                            ? 'bg-brand-info/10 border-brand-info/60 text-brand-info'
                            : 'bg-brand-deep border-brand-border text-white/60 hover:text-white'
                        }`}
                      >
                        {Icon && <Icon className="w-3.5 h-3.5" aria-hidden="true" />}
                        {label}
                      </motion.button>
                    );
                  })}
                </div>
              )}
              {/* Musafir jamʿ taʾkhīr — flag the pair as joined */}
              {canJoin(prayerId) &&
                (prayerId === 'asr' || prayerId === 'isha') &&
                jamWith &&
                ['completed', 'kaza'].includes(normaliseStatus(log?.prayers[jamWith]?.status)) && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleJoined(prayerId)}
                    aria-pressed={!!entry?.jam}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-control text-xs font-semibold border transition-colors ${
                      entry?.jam
                        ? 'bg-brand-gold/20 border-brand-gold/60 text-brand-gold'
                        : 'bg-brand-deep border-brand-border text-white/60 hover:text-white'
                    }`}
                  >
                    <LinkIcon className="w-3.5 h-3.5" aria-hidden="true" />
                    {t('salatTracker.joinedWith', 'Joined with {{name}}', {
                      name: translateSalatName(jamWith, jamWith, t),
                    })}
                  </motion.button>
                )}
              {/* After-salat toggles */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white/60 text-xs shrink-0">
                  {t('salatTracker.afterSalat', 'After salat:')}
                </span>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleSubTag(prayerId, 'tasbeeh', !(entry?.tasbeeh ?? false))}
                  aria-pressed={!!entry?.tasbeeh}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-control text-xs font-semibold border transition-colors ${
                    entry?.tasbeeh
                      ? 'bg-brand-info/10 border-brand-info/60 text-brand-info'
                      : 'bg-brand-deep border-brand-border text-white/60 hover:text-white'
                  }`}
                >
                  <TasbihIcon className="w-3.5 h-3.5" />
                  {t('salatTracker.tasbeeh', 'Tasbeeh')}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() =>
                    handleSubTag(prayerId, 'ayatulKursi', !(entry?.ayatulKursi ?? false))
                  }
                  aria-pressed={!!entry?.ayatulKursi}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-control text-xs font-semibold border transition-colors ${
                    entry?.ayatulKursi
                      ? 'bg-brand-gold/20 border-brand-gold/60 text-brand-gold'
                      : 'bg-brand-deep border-brand-border text-white/60 hover:text-white'
                  }`}
                >
                  <BookOpenIcon className="w-3.5 h-3.5" aria-hidden="true" />
                  {t('salatTracker.ayatulKursi', 'Ayatul Kursi')}
                </motion.button>
              </div>

              {/* Read now — authentic recitations tied to this prayer,
                                each opening directly in the Quran reader. */}
              {(() => {
                const recs = recitationsFor(prayerId, isFridayToday);
                if (recs.length === 0) return null;
                // Deliberately understated: plain inline links, no
                // button chrome. These are optional sunnah, and a
                // row of chunky buttons read as a to-do list —
                // the opposite of the intent.
                return (
                  <div className="pt-1.5 border-t border-brand-border/50">
                    <p className="text-white/50 text-[11px] leading-relaxed">
                      <span className="text-white/50">
                        {t('salatTracker.optionalPrefix', 'Optional')} ·{' '}
                      </span>
                      {recs.map((r, i) => (
                        <span key={r.id}>
                          {i > 0 && <span className="text-white/40"> · </span>}
                          <button
                            onClick={() => navigate(recitationHref(r))}
                            title={
                              r.weak
                                ? `${r.note}: ${r.source} (${r.grade}). ${r.caveat ?? ''}`
                                : `${r.note}: ${r.source} (${r.grade})`
                            }
                            className={`underline underline-offset-2 decoration-dotted transition-colors ${
                              r.fridayOnly
                                ? 'text-brand-gold hover:text-brand-gold'
                                : 'text-white/60 hover:text-brand-emerald'
                            }`}
                          >
                            {r.label}
                          </button>
                          {/* A weak narration must never sit next
                                            to ṣaḥīḥ ones unmarked. */}
                          {r.weak && (
                            <span
                              title={r.caveat}
                              className="ml-1 text-[9px] uppercase tracking-wide text-brand-gold border border-brand-gold/40 rounded px-1 py-px align-middle"
                            >
                              {t('salatTracker.daif', 'ḍaʿīf')}
                            </span>
                          )}
                        </span>
                      ))}
                    </p>
                  </div>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Optional "why missed" reason picker — never required */}
      <AnimatePresence>
        {status === 'missed' && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden border-t border-brand-border/70"
          >
            <div className="px-3 py-2.5 flex items-center gap-1.5 flex-wrap">
              <span className="text-white/60 text-[11px] sm:text-xs">
                {t('salatTracker.missedReasonLabel', 'Why? (optional)')}
              </span>
              {MISSED_REASONS.map((reason) => (
                <motion.button
                  key={reason}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleMissedReason(prayerId, reason)}
                  aria-pressed={entry?.missedReason === reason}
                  className={`px-2 py-1 sm:px-2.5 rounded-control text-[11px] sm:text-xs font-semibold border transition-colors ${
                    entry?.missedReason === reason
                      ? 'bg-red-400/15 border-red-400/60 text-red-400'
                      : 'bg-brand-deep border-brand-border text-white/60 hover:text-white'
                  }`}
                >
                  {t(`salatTracker.missedReason.${reason}`, reason)}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
