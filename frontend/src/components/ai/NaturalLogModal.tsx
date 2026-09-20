import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, TrashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import {
  useParseNaturalLog,
  useCommitNaturalLog,
  type ParsedSalatEntry,
  type ParsedZikrEntry,
  type ParsedQuranEntry,
} from '../../hooks/useNaturalLog.js';
import { AiBadge, AiThinking, AiDisclaimer } from './AiFlair.js';
import { PRAYER_META, translateSalatName } from '../../utils/prayerTimes.js';
import { getTrackingDay } from '../../utils/trackingDay.js';
import { useZikrStore } from '../../store/useZikrStore.js';
import { getUserTimezoneOffset } from '../../utils/timezone.js';

type Phase = 'input' | 'preview' | 'success' | 'empty';

function shiftDate(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

const EXAMPLES_KEYS = [
  'naturalLog.example1',
  'naturalLog.example2',
  'naturalLog.example3',
] as const;

export default function NaturalLogModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<Phase>('input');
  const [salat, setSalat] = useState<ParsedSalatEntry[]>([]);
  const [zikr, setZikr] = useState<ParsedZikrEntry[]>([]);
  const [quran, setQuran] = useState<ParsedQuranEntry | null>(null);
  const [day, setDay] = useState<'today' | 'yesterday'>('today');

  const parseMut = useParseNaturalLog();
  const commitMut = useCommitNaturalLog();

  const handleParse = () => {
    if (!text.trim() || parseMut.isPending) return;
    parseMut.mutate(text.trim(), {
      onSuccess: (r) => {
        if (!r.ok || (r.salat.length === 0 && r.zikr.length === 0 && !r.quran)) {
          setPhase('empty');
          return;
        }
        setSalat(r.salat);
        setZikr(r.zikr);
        setQuran(r.quran);
        setDay(r.day === 'yesterday' ? 'yesterday' : 'today');
        setPhase('preview');
      },
      onError: () => setPhase('empty'),
    });
  };

  const handleConfirm = () => {
    // The tracking day (Fajr-aware), or the one before it when the note said
    // "yesterday" / "last night".
    const trackingToday = getTrackingDay();
    const date = day === 'yesterday' ? shiftDate(trackingToday, -1) : trackingToday;
    commitMut.mutate(
      {
        salat,
        zikr,
        quranAyat: quran?.ayat ?? null,
        date,
        timezoneOffset: getUserTimezoneOffset(),
      },
      {
        onSuccess: () => {
          // The counter page keeps its own local copy of today's counts;
          // fold these in so it doesn't show stale numbers until the next sync.
          if (day === 'today') {
            const { addConfirmedCounts } = useZikrStore.getState();
            for (const z of zikr) addConfirmedCounts(z.typeName, z.count);
          }
          setPhase('success');
        },
      }
    );
  };

  const hasAnything = salat.length > 0 || zikr.length > 0 || !!quran;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[70] p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ scale: 0.95, y: 12 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 12 }}
          transition={{ type: 'spring', damping: 24 }}
          className="bg-brand-surface rounded-3xl p-6 w-full max-w-md shadow-2xl border border-brand-border max-h-[85vh] overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <AiBadge label={t('naturalLog.badgeLabel', 'Naseeh · quick log')} />
            <button
              onClick={onClose}
              className="shrink-0 w-8 h-8 grid place-items-center rounded-full text-white/40 hover:text-white hover:bg-white/5 transition-colors"
              aria-label={t('common.close')}
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {phase === 'input' && (
            <div className="space-y-3">
              <p className="text-white/60 text-sm">
                {t(
                  'naturalLog.inputPrompt',
                  'Describe what you did in one sentence — Naseeh will turn it into a log entry for you to review.'
                )}
              </p>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={400}
                rows={3}
                placeholder={t(
                  EXAMPLES_KEYS[0],
                  'Prayed fajr in jamaah, read 5 pages, 100 istighfar'
                )}
                className="textarea w-full rounded-xl bg-brand-deep border-brand-border text-white text-sm focus:border-brand-emerald"
              />
              <p className="text-white/25 text-[11px]">
                {t('naturalLog.examplesHint', 'Try: ')}
                <span className="italic">
                  {t(EXAMPLES_KEYS[1], '"Asr and maghrib at the mosque, 33 subhanallah"')}
                </span>
              </p>
              <button
                onClick={handleParse}
                disabled={!text.trim() || parseMut.isPending}
                className="btn w-full rounded-xl bg-brand-emerald hover:bg-brand-emerald-dim border-0 text-white disabled:opacity-40"
              >
                {parseMut.isPending
                  ? t('naturalLog.parsing', 'Reading…')
                  : t('naturalLog.parseButton', 'Read my note')}
              </button>
              {parseMut.isPending && <AiThinking />}
            </div>
          )}

          {phase === 'empty' && (
            <div className="space-y-3 text-center py-4">
              <p className="text-white/60 text-sm">
                {t(
                  'naturalLog.emptyResult',
                  "Naseeh couldn't find anything to log in that note — try mentioning a prayer, a dhikr count, or pages read."
                )}
              </p>
              <button
                onClick={() => setPhase('input')}
                className="btn btn-sm rounded-xl bg-white/5 border-brand-border text-white/70"
              >
                {t('naturalLog.tryAgain', 'Try again')}
              </button>
            </div>
          )}

          {phase === 'preview' && (
            <div className="space-y-4">
              <p className="text-white/50 text-xs">
                {t(
                  'naturalLog.previewHint',
                  "Here's what Naseeh understood — remove anything that's wrong, then confirm."
                )}
              </p>

              <div className="flex items-center gap-2">
                <span className="text-white/30 text-[10px] font-bold uppercase tracking-widest">
                  {t('naturalLog.dayLabel', 'For')}
                </span>
                <div className="join">
                  {(['today', 'yesterday'] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDay(d)}
                      className={`join-item btn btn-xs ${day === d ? 'bg-brand-emerald/25 border-brand-emerald/40 text-brand-emerald' : 'bg-white/5 border-brand-border text-white/50'}`}
                    >
                      {d === 'today'
                        ? t('naturalLog.dayToday', 'Today')
                        : t('naturalLog.dayYesterday', 'Yesterday')}
                    </button>
                  ))}
                </div>
              </div>

              {salat.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">
                    {t('naturalLog.salatSection', 'Prayers')}
                  </p>
                  {salat.map((s, i) => {
                    const meta = PRAYER_META.find((p) => p.id === s.prayer);
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-2 rounded-xl bg-brand-deep border border-brand-border px-3 py-2 text-sm"
                      >
                        <span className="text-white/80 flex items-center gap-2">
                          <span>{meta?.icon}</span>
                          {translateSalatName(s.prayer, meta?.name ?? s.prayer, t)}
                          <span className="text-white/30 text-xs">
                            ·{' '}
                            {s.status === 'kaza'
                              ? t('naturalLog.statusKaza', 'kaza')
                              : t('naturalLog.statusCompleted', 'on time')}
                            {s.location ? ` · ${s.location}` : ''}
                          </span>
                        </span>
                        <button
                          onClick={() => setSalat((prev) => prev.filter((_, idx) => idx !== i))}
                          className="text-white/30 hover:text-red-400 shrink-0"
                          aria-label={t('naturalLog.remove', 'Remove')}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {zikr.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">
                    {t('naturalLog.zikrSection', 'Dhikr')}
                  </p>
                  {zikr.map((z, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 rounded-xl bg-brand-deep border border-brand-border px-3 py-2 text-sm"
                    >
                      <span className="text-white/80 truncate">
                        {z.typeName}
                        {z.isNew && (
                          <span className="ml-1.5 text-[10px] text-brand-gold/80">
                            {t('naturalLog.newDhikr', '(new dhikr)')}
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          type="number"
                          min={1}
                          max={100000}
                          value={z.count}
                          onChange={(e) => {
                            const n = Math.max(1, Math.min(100000, Number(e.target.value) || 1));
                            setZikr((prev) =>
                              prev.map((it, idx) => (idx === i ? { ...it, count: n } : it))
                            );
                          }}
                          className="input input-xs w-20 rounded-lg bg-brand-surface border-brand-border text-white text-right"
                        />
                        <button
                          onClick={() => setZikr((prev) => prev.filter((_, idx) => idx !== i))}
                          className="text-white/30 hover:text-red-400"
                          aria-label={t('naturalLog.remove', 'Remove')}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {quran && (
                <div className="space-y-1.5">
                  <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">
                    {t('naturalLog.quranSection', "Qur'an reading")}
                  </p>
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-brand-deep border border-brand-border px-3 py-2 text-sm">
                    <span className="text-white/80">
                      {t('naturalLog.quranAyatCount', '{{count, number}} ayat', {
                        count: quran.ayat,
                      })}
                      {quran.approximate && (
                        <span className="text-white/30 text-xs">
                          {' '}
                          ({t('naturalLog.approximate', 'approximate')})
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        min={1}
                        max={6236}
                        value={quran.ayat}
                        onChange={(e) => {
                          const n = Math.max(1, Math.min(6236, Number(e.target.value) || 1));
                          setQuran((prev) => (prev ? { ...prev, ayat: n } : prev));
                        }}
                        className="input input-xs w-20 rounded-lg bg-brand-surface border-brand-border text-white text-right"
                      />
                      <button
                        onClick={() => setQuran(null)}
                        className="text-white/30 hover:text-red-400"
                        aria-label={t('naturalLog.remove', 'Remove')}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setPhase('input')}
                  className="btn btn-sm flex-1 rounded-xl bg-white/5 border-brand-border text-white/70"
                >
                  {t('naturalLog.back', 'Back')}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!hasAnything || commitMut.isPending}
                  className="btn btn-sm flex-[2] rounded-xl bg-brand-emerald hover:bg-brand-emerald-dim border-0 text-white disabled:opacity-40"
                >
                  {commitMut.isPending
                    ? t('naturalLog.logging', 'Logging…')
                    : t('naturalLog.confirmButton', 'Confirm & log')}
                </button>
              </div>
              <AiDisclaimer />
            </div>
          )}

          {phase === 'success' && (
            <div className="space-y-3 text-center py-4">
              <CheckCircleIcon className="w-10 h-10 text-brand-emerald mx-auto" />
              <p className="text-white/80 text-sm font-semibold">
                {t('naturalLog.successMessage', 'Logged — well done for keeping track.')}
              </p>
              <button
                onClick={onClose}
                className="btn btn-sm rounded-xl bg-brand-emerald/10 border-brand-emerald/30 text-brand-emerald"
              >
                {t('common.close')}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
