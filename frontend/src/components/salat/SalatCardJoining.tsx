import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import { CheckIcon, LinkIcon } from '@heroicons/react/24/outline';
import { type PrayerId, type PrayerStatus, type SalatLog } from '../../hooks/useSalatLog.js';
import { translateSalatName } from '../../utils/prayerTimes.js';
import { translateReference } from '../../utils/localeReference.js';
import { useMusafir, updateMusafir, jamPartner } from '../../utils/musafir.js';
import { isFuturePrayer, RefIcon } from './salatParts.js';

/** Musafir jamʿ: the offer to pray a pair together, and the Ḥanafī note. */
export default function SalatCardJoining({
  prayerId,
  isToday,
  isCurrent,
  hasSubTag,
  status,
  jamWith,
  rowTravel,
  canJoin,
  travelPrayer,
  normaliseStatus,
  log,
  todayPrayerTimes,
  musafir,
  joinPair,
}: {
  prayerId: PrayerId;
  isToday: boolean;
  isCurrent: boolean;
  hasSubTag: boolean;
  status: PrayerStatus;
  jamWith: ReturnType<typeof jamPartner>;
  rowTravel: boolean;
  canJoin: (p: PrayerId) => boolean;
  travelPrayer: (p: PrayerId) => boolean;
  normaliseStatus: (raw: string | undefined) => PrayerStatus;
  log: SalatLog | undefined;
  todayPrayerTimes: { times: Record<string, Date> } | null;
  musafir: ReturnType<typeof useMusafir>;
  joinPair: (first: PrayerId, kind: 'taqdim' | 'takhir') => void;
}) {
  const { t, i18n } = useTranslation();

  return (
    <>
      {/* Sunnah/nafl rak'ah guidance — tied to the prayer's
                            OWN window (isCurrent), not "any time from when it
                            started onward" (!isFuture): the latter never
                            closed once a prayer's time had passed, so Fajr's
                            guidance was still showing at Isha. Independently
                            toggleable per emphasis (Salat settings). */}
      {/* Musafir jamʿ — pray the pair together. On Ẓuhr/Maghrib
                            (its own time, partner not yet due): taqdīm. On ʿAṣr/ʿIshāʾ
                            (its own time, partner still unprayed): taʾkhīr. */}
      {canJoin(prayerId) &&
        isToday &&
        jamWith &&
        (() => {
          const partnerStatus = normaliseStatus(log?.prayers[jamWith]?.status);
          const isFirst = prayerId === 'dhuhr' || prayerId === 'maghrib';
          const offer = isFirst
            ? (isCurrent || hasSubTag) &&
              status !== 'missed' &&
              partnerStatus === 'pending' &&
              isFuturePrayer(jamWith, todayPrayerTimes?.times)
            : isCurrent && status !== 'missed' && partnerStatus === 'pending';
          if (!offer) return null;
          const first = isFirst ? prayerId : jamWith;
          const second = isFirst ? jamWith : prayerId;
          const names = {
            a: translateSalatName(first, first, t),
            b: translateSalatName(second, second, t),
          };
          return (
            <div className="px-3 py-2.5 border-t border-brand-gold/20 bg-brand-gold/5">
              <div className="flex items-center gap-3">
                <LinkIcon className="w-4 h-4 shrink-0 text-brand-gold" aria-hidden="true" />
                <p className="flex-1 min-w-0 text-white/70 text-xs leading-snug">
                  {isFirst
                    ? t(
                        'salatTracker.jamOfferTaqdim',
                        'On the move? Pray {{a}} and {{b}} together now, in {{a}} time (jamʿ taqdīm).',
                        names
                      )
                    : t(
                        'salatTracker.jamOfferTakhir',
                        '{{a}} not prayed yet? Pray {{a}} and {{b}} together now, in {{b}} time (jamʿ taʾkhīr).',
                        names
                      )}
                </p>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => joinPair(first, isFirst ? 'taqdim' : 'takhir')}
                  className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-control text-xs font-bold bg-brand-gold/20 border border-brand-gold/60 text-brand-gold hover:bg-brand-gold/30"
                >
                  <CheckIcon className="w-3.5 h-3.5" aria-hidden="true" />
                  {t('salatTracker.jamBoth', '{{a}} + {{b}}', names)}
                </motion.button>
              </div>
              <a
                href={
                  isFirst ? 'https://sunnah.com/tirmidhi:553' : 'https://sunnah.com/bukhari:1111'
                }
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="ml-7 mt-1 inline-block text-brand-gold/80 text-[11px] underline hover:text-brand-gold"
              >
                <RefIcon />
                {translateReference(
                  isFirst
                    ? 'Jāmiʿ al-Tirmidhī 553 · Ṣaḥīḥ (al-Albānī)'
                    : 'Ṣaḥīḥ al-Bukhārī 1111 · Ṣaḥīḥ',
                  i18n.language
                )}
              </a>
            </div>
          );
        })()}

      {/* Ḥanafī view: no real joining, so say so here (instead of
                            silently showing nothing) and offer the formal way plus
                            a one-tap switch to the majority view for this journey. */}
      {isToday &&
        musafir?.school === 'hanafi' &&
        (prayerId === 'dhuhr' || prayerId === 'maghrib') &&
        isCurrent &&
        jamWith &&
        rowTravel &&
        travelPrayer(jamWith) &&
        normaliseStatus(log?.prayers[jamWith]?.status) === 'pending' &&
        isFuturePrayer(jamWith, todayPrayerTimes?.times) && (
          <div className="px-3 py-2.5 border-t border-brand-gold/20 bg-brand-gold/5">
            <div className="flex items-start gap-2">
              <LinkIcon className="w-4 h-4 mt-px shrink-0 text-brand-gold" aria-hidden="true" />
              <p className="flex-1 min-w-0 text-white/70 text-xs leading-snug">
                {t(
                  'salatTracker.jamHanafi',
                  'Joining {{a}} and {{b}} in one time is not part of the Ḥanafī view you follow. The Ḥanafī way: pray {{a}} near the end of its time and {{b}} as soon as it begins.',
                  {
                    a: translateSalatName(prayerId, prayerId, t),
                    b: translateSalatName(jamWith, jamWith, t),
                  }
                )}
              </p>
            </div>
            <button
              onClick={() => {
                updateMusafir({ school: 'majority' });
                toast.success(
                  t(
                    'salatTracker.jamSwitched',
                    'Now following the majority view for this journey.'
                  ),
                  {
                    icon: <LinkIcon className="w-4 h-4 shrink-0 text-brand-gold" />,
                  }
                );
              }}
              className="mt-2 ml-6 px-2.5 py-1 rounded-control text-[11px] font-bold bg-brand-gold/15 border border-brand-gold/50 text-brand-gold hover:bg-brand-gold/25"
            >
              {t('salatTracker.jamUseMajority', 'Follow the majority view (allows joining)')}
            </button>
          </div>
        )}
    </>
  );
}
