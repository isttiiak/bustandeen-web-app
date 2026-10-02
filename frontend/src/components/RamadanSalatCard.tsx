import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  useSalatLog,
  useUpdatePrayer,
  useUpdateNafl,
  NAFL_TYPE_META,
  SELECTABLE_NAFL_TYPES,
  type PrayerId,
  type PrayerStatus,
  type NaflType,
} from '../hooks/useSalatLog.js';
import { translateSalatName } from '../utils/prayerTimes.js';
import { useZikrStore } from '../store/useZikrStore.js';
import {
  getTasbihMode,
  tasbihModeMeta,
  tasbihDeltas,
  AYATUL_KURSI_ZIKR,
  getAutoCountDhikr,
  wasDhikrCredited,
  setDhikrCredited,
} from '../utils/salatPrefs.js';
import { celebrateSmall, celebrateAllPrayers } from '../utils/celebrate.js';

/**
 * The salat tracker, inlined into /ramadan.
 *
 * Istiak's principle for the month: fewer clicks, no navigation. Leaving
 * /ramadan to mark Fajr and losing your scroll position is exactly the friction
 * Ramadan should not have. This is a COMPACT view over the very same hooks and
 * the same server rows as /salat — not a copy of the data — so anything logged
 * here shows up there and vice versa, including the tasbīḥ → dhikr wiring.
 *
 * Deliberately NOT included (they belong on the full page): per-prayer location
 * tags, the date navigator, past-day editing, and the post-salat Qurʾān links.
 */

const PRAYERS: { id: PrayerId; name: string; emoji: string }[] = [
  { id: 'fajr', name: 'Fajr', emoji: '🌅' },
  { id: 'dhuhr', name: 'Dhuhr', emoji: '☀️' },
  { id: 'asr', name: 'Asr', emoji: '🌇' },
  { id: 'maghrib', name: 'Maghrib', emoji: '🌆' },
  { id: 'isha', name: 'Isha', emoji: '🌙' },
];

const MIN_RAKAT = 2;

function suggestedRakat(types: NaflType[]): number {
  if (types.length === 0) return MIN_RAKAT;
  return types.reduce(
    (sum, id) => sum + (NAFL_TYPE_META.find((m) => m.id === id)?.defaultRakat ?? MIN_RAKAT),
    0
  );
}

export default function RamadanSalatCard({
  date,
  excused,
  tarawih,
  onToggleTarawih,
}: {
  date: string;
  excused: boolean;
  /** Tarawih lives on the FastingLog row, not the salat log, so the owning
   * page passes it down rather than this card fetching it twice. Omit both
   * props outside Ramadan and the row simply doesn't render. */
  tarawih?: boolean;
  onToggleTarawih?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { data: log } = useSalatLog(date);
  const updatePrayer = useUpdatePrayer();
  const updateNafl = useUpdateNafl();
  const queryClient = useQueryClient();
  const addCounts = useZikrStore((s) => s.addCounts);
  const flushZikr = useZikrStore((s) => s.flush);

  const [openPrayer, setOpenPrayer] = useState<PrayerId | null>(null);
  const [naflOpen, setNaflOpen] = useState(false);

  const nafl = log?.nafl ?? { completed: false, types: [] as NaflType[], rakat: MIN_RAKAT };

  const doneCount = useMemo(
    () =>
      PRAYERS.filter((p) => {
        const s = log?.prayers?.[p.id]?.status;
        return s === 'completed' || s === 'kaza';
      }).length,
    [log]
  );

  const normalise = (raw?: string): PrayerStatus =>
    raw === 'prayed' || raw === 'mosque' ? 'completed' : ((raw as PrayerStatus) ?? 'pending');

  const setStatus = (prayer: PrayerId, status: PrayerStatus) => {
    const current = log?.prayers?.[prayer];
    const next: PrayerStatus = normalise(current?.status) === status ? 'pending' : status;
    updatePrayer.mutate({
      prayer,
      status: next,
      date,
      location: current?.location ?? 'home',
      tasbeeh: current?.tasbeeh ?? false,
      ayatulKursi: current?.ayatulKursi ?? false,
    });
    if (next === 'completed' || next === 'kaza') {
      const after = PRAYERS.filter((p) => {
        const s = p.id === prayer ? next : log?.prayers?.[p.id]?.status;
        return s === 'completed' || s === 'kaza';
      }).length;
      if (after >= 5) celebrateAllPrayers();
      else celebrateSmall();
      setOpenPrayer(prayer);
    } else {
      setOpenPrayer(null);
    }
  };

  /** Same contract as SalatTracker.creditDhikr — tap adds, un-tap subtracts,
   * gated by the same auto-count-dhikr setting (see its doc comment there);
   * `date` here is always today (see the component doc comment above), so
   * unlike the full tracker this never needs a back-dating guard. */
  const toggleTag = (prayer: PrayerId, kind: 'tasbeeh' | 'ayatulKursi') => {
    const current = log?.prayers?.[prayer];
    const was = kind === 'tasbeeh' ? (current?.tasbeeh ?? false) : (current?.ayatulKursi ?? false);
    const on = !was;
    const status = normalise(current?.status);

    updatePrayer.mutate({
      prayer,
      status: status === 'pending' ? 'completed' : status,
      date,
      location: current?.location ?? 'home',
      tasbeeh: kind === 'tasbeeh' ? on : (current?.tasbeeh ?? false),
      ayatulKursi: kind === 'ayatulKursi' ? on : (current?.ayatulKursi ?? false),
    });

    if (on && !getAutoCountDhikr()) {
      toast.success(
        kind === 'tasbeeh'
          ? t('salatTracker.dhikrMarkedOnly', 'Marked — count it yourself in Tasbih mode')
          : t('salatTracker.ayatulKursiMarkedOnly', 'Ayatul Kursi marked'),
        { icon: '✅', duration: 2000 }
      );
      return;
    }
    if (!on && !wasDhikrCredited(date, prayer, kind)) return;

    const sign: 1 | -1 = on ? 1 : -1;
    if (kind === 'tasbeeh') {
      const meta = tasbihModeMeta(getTasbihMode());
      addCounts(tasbihDeltas(meta.id, sign));
      toast.success(
        on
          ? t('ramadanSalat.tasbeehAdded', { label: meta.label })
          : t('ramadanSalat.tasbeehRemoved', { label: meta.label }),
        { icon: '📿', duration: 2000 }
      );
    } else {
      addCounts({ [AYATUL_KURSI_ZIKR]: sign });
      toast.success(
        on ? t('ramadanSalat.ayatulKursiCounted') : t('ramadanSalat.ayatulKursiRemoved'),
        { icon: '📖', duration: 1800 }
      );
    }
    setDhikrCredited(date, prayer, kind, on);
    void (async () => {
      await flushZikr();
      await queryClient.invalidateQueries({ queryKey: ['analytics'] });
    })();
  };

  const toggleNaflDone = () => {
    const completed = !nafl.completed;
    const types = completed ? (nafl.types ?? []) : [];
    updateNafl.mutate({ completed, types, rakat: suggestedRakat(types), date });
    setNaflOpen(completed);
  };

  const toggleNaflType = (t: NaflType) => {
    const cur = nafl.types ?? [];
    const next = cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t];
    updateNafl.mutate({
      completed: nafl.completed,
      types: next,
      rakat: suggestedRakat(next),
      date,
    });
  };

  const stepRakat = (delta: number) => {
    const next = Math.max(MIN_RAKAT, (nafl.rakat ?? suggestedRakat(nafl.types ?? [])) + delta * 2);
    updateNafl.mutate({ completed: nafl.completed, types: nafl.types ?? [], rakat: next, date });
  };

  return (
    <div className="rounded-3xl bg-brand-deep/80 border border-brand-border p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-white font-black">{t('ramadanSalat.todaysSalat')}</h2>
        <span className="text-white/40 text-xs font-bold tabular-nums">{doneCount}/5</span>
      </div>

      {excused ? (
        <p className="text-brand-pink/70 text-xs leading-relaxed">
          {t('ramadanSalat.excusedMessage')}
        </p>
      ) : (
        <>
          <div className="space-y-1.5">
            {PRAYERS.map((p) => {
              const entry = log?.prayers?.[p.id];
              const status = normalise(entry?.status);
              const done = status === 'completed' || status === 'kaza';
              const isOpen = openPrayer === p.id;
              return (
                <div
                  key={p.id}
                  className={`rounded-2xl border transition-colors ${
                    done
                      ? 'border-brand-emerald/25 bg-brand-emerald/[0.07]'
                      : 'border-brand-emerald/10 bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-2 p-2.5">
                    <span className="text-base shrink-0">{p.emoji}</span>
                    <span
                      className={`flex-1 min-w-0 truncate text-sm font-bold ${done ? 'text-brand-emerald' : 'text-white/55'}`}
                    >
                      {translateSalatName(p.id, p.name, t)}
                    </span>
                    {entry?.tasbeeh && (
                      <span className="text-brand-info/60 text-xs shrink-0">📿</span>
                    )}
                    {entry?.ayatulKursi && (
                      <span className="text-brand-gold/60 text-xs shrink-0">📖</span>
                    )}
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => setStatus(p.id, 'completed')}
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                          status === 'completed'
                            ? 'bg-brand-emerald/25 border-brand-emerald/50 text-brand-emerald'
                            : 'bg-brand-deep border-brand-border text-white/40 hover:text-white/70'
                        }`}
                      >
                        ✅
                      </button>
                      <button
                        onClick={() => setStatus(p.id, 'kaza')}
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                          status === 'kaza'
                            ? 'bg-brand-gold/25 border-brand-gold/50 text-brand-gold'
                            : 'bg-brand-deep border-brand-border text-white/40 hover:text-white/70'
                        }`}
                      >
                        ⏰
                      </button>
                      {done && (
                        <button
                          onClick={() => setOpenPrayer(isOpen ? null : p.id)}
                          aria-label={`After-salat options for ${translateSalatName(p.id, p.name, t)}`}
                          className="px-2 py-1 rounded-lg text-[11px] border bg-brand-deep border-brand-border text-white/30 hover:text-white/60"
                        >
                          {isOpen ? '▲' : '▾'}
                        </button>
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {done && isOpen && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="px-2.5 pb-2.5 flex items-center gap-2 flex-wrap"
                      >
                        <span className="text-white/25 text-[11px]">
                          {t('ramadanSalat.afterSalat')}:
                        </span>
                        <button
                          onClick={() => toggleTag(p.id, 'tasbeeh')}
                          className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                            entry?.tasbeeh
                              ? 'bg-brand-info/20 border-brand-info/50 text-brand-info'
                              : 'bg-brand-deep border-brand-border text-white/40 hover:text-white/70'
                          }`}
                        >
                          📿 Tasbeeh
                        </button>
                        <button
                          onClick={() => toggleTag(p.id, 'ayatulKursi')}
                          className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                            entry?.ayatulKursi
                              ? 'bg-brand-gold/20 border-brand-gold/50 text-brand-gold'
                              : 'bg-brand-deep border-brand-border text-white/40 hover:text-white/70'
                          }`}
                        >
                          📖 Ayatul Kursi
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Tarawih — sits directly under Isha because that is when it is
              prayed ("he prayed it, then people gathered" — Bukhārī 2010).
              Only rendered when the owning page supplies the handler, i.e.
              during Ramadan. */}
          {onToggleTarawih && (
            <button
              onClick={onToggleTarawih}
              className={`mt-1.5 w-full flex items-center gap-2 rounded-2xl border p-2.5 text-left transition-colors ${
                tarawih
                  ? 'border-brand-info/40 bg-brand-info/15'
                  : 'border-brand-emerald/10 bg-white/[0.03] hover:border-brand-info/25'
              }`}
            >
              <span className="text-base shrink-0">🕌</span>
              <span
                className={`flex-1 min-w-0 text-sm font-bold ${tarawih ? 'text-brand-info' : 'text-white/55'}`}
              >
                {t('ramadanSalat.tarawih')}
                <span className="block text-[10px] font-semibold text-white/25">
                  {t('ramadanSalat.tarawihSub')}
                </span>
              </span>
              <span
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border shrink-0 ${
                  tarawih
                    ? 'bg-brand-info/25 border-brand-info/50 text-brand-info'
                    : 'bg-brand-deep border-brand-border text-white/40'
                }`}
              >
                {tarawih ? t('ramadanSalat.prayed') : t('ramadanSalat.markDone')}
              </span>
            </button>
          )}

          {/* Nafl — extra weight in Ramadan, so it lives here rather than a page away */}
          <div
            className={`mt-2.5 rounded-2xl border p-2.5 ${
              nafl.completed
                ? 'border-brand-info/25 bg-brand-info/[0.07]'
                : 'border-brand-emerald/10 bg-white/[0.03]'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-base shrink-0">🌙</span>
              <span
                className={`flex-1 min-w-0 text-sm font-bold ${nafl.completed ? 'text-brand-info' : 'text-white/55'}`}
              >
                {t('ramadanSalat.nafl')}
                {nafl.completed && (
                  <span className="text-white/30 font-semibold">
                    {' '}
                    · {nafl.rakat ?? MIN_RAKAT} {t('ramadanSalat.rakah')}
                  </span>
                )}
              </span>
              <button
                onClick={toggleNaflDone}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border shrink-0 transition-colors ${
                  nafl.completed
                    ? 'bg-brand-info/25 border-brand-info/50 text-brand-info'
                    : 'bg-brand-deep border-brand-border text-white/40 hover:text-white/70'
                }`}
              >
                {nafl.completed ? t('ramadanSalat.done') : t('ramadanSalat.markDone')}
              </button>
              {nafl.completed && (
                <button
                  onClick={() => setNaflOpen((v) => !v)}
                  aria-label={t('ramadanSalat.naflDetails', 'Nafl details')}
                  className="px-2 py-1 rounded-lg text-[11px] border bg-brand-deep border-brand-border text-white/30 hover:text-white/60 shrink-0"
                >
                  {naflOpen ? '▲' : '▾'}
                </button>
              )}
            </div>

            <AnimatePresence>
              {nafl.completed && naflOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="mt-2.5 space-y-2.5"
                >
                  <div className="flex flex-wrap gap-1.5">
                    {SELECTABLE_NAFL_TYPES.map((nt) => {
                      const on = (nafl.types ?? []).includes(nt.id);
                      return (
                        <button
                          key={nt.id}
                          onClick={() => toggleNaflType(nt.id)}
                          title={
                            i18n.language === 'bn' && nt.shortNoteBn ? nt.shortNoteBn : nt.shortNote
                          }
                          className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                            on
                              ? 'bg-brand-info/20 border-brand-info/50 text-brand-info'
                              : 'bg-brand-deep border-brand-border text-white/40 hover:text-white/70'
                          }`}
                        >
                          {nt.emoji} {translateSalatName(nt.id, nt.label, t)}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/25 text-[11px]">{t('ramadanSalat.rakahs')}:</span>
                    <button
                      onClick={() => stepRakat(-1)}
                      disabled={(nafl.rakat ?? MIN_RAKAT) <= MIN_RAKAT}
                      className="w-6 h-6 rounded-lg bg-brand-deep border border-brand-border text-white/60 font-bold text-sm disabled:opacity-25"
                    >
                      −
                    </button>
                    <span className="text-white font-black text-sm tabular-nums w-6 text-center">
                      {nafl.rakat ?? MIN_RAKAT}
                    </span>
                    <button
                      onClick={() => stepRakat(1)}
                      className="w-6 h-6 rounded-lg bg-brand-deep border border-brand-border text-white/60 font-bold text-sm"
                    >
                      +
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}
