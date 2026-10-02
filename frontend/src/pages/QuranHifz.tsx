import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AnimatedBackground from '../components/AnimatedBackground.js';
import QuranTabNav from '../components/QuranTabNav.js';
import DemoSignInGate from '../components/DemoSignInGate.js';
import HifzReviewModal from '../components/HifzReviewModal.js';
import HifzLearnModal from '../components/HifzLearnModal.js';
import ConfirmDialog from '../components/ConfirmDialog.js';
import { useAuthStore } from '../store/useAuthStore.js';
import {
  useHifzSummary,
  useHifzQueue,
  useAddNextHifz,
  useAddHifzEntry,
  useRemoveHifzEntry,
  useReviewHifz,
  useUpdateHifzProfile,
  type HifzQueueEntry,
  type HifzResult,
} from '../hooks/useHifz.js';
import { loadSurahList, surahDisplayName, type SurahMeta } from '../utils/quranData.js';
import { formatLocaleNumber } from '../utils/localeDate.js';

const STATE_COLOR: Record<string, string> = {
  new: 'bg-white/10',
  learning: 'bg-red-500/50',
  consolidating: 'bg-brand-gold/50',
  solid: 'bg-brand-emerald/60',
};

const STATE_LABEL_KEY: Record<string, string> = {
  new: 'hifz.stateNew',
  learning: 'hifz.stateLearning',
  consolidating: 'hifz.stateConsolidating',
  solid: 'hifz.stateSolid',
};

export default function QuranHifz() {
  const { t, i18n } = useTranslation();
  const isDemoMode = useAuthStore((s) => s.isDemoMode);
  const { data: summary } = useHifzSummary();
  const { data: queue } = useHifzQueue();
  const addNext = useAddNextHifz();
  const addEntry = useAddHifzEntry();
  const removeEntry = useRemoveHifzEntry();
  const review = useReviewHifz();
  const updateProfile = useUpdateHifzProfile();

  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [pendingRemove, setPendingRemove] = useState<HifzQueueEntry | null>(null);
  const [reviewing, setReviewing] = useState<HifzQueueEntry | null>(null);
  const [learning, setLearning] = useState<{
    surah: number;
    ayah: number;
    mode: 'next' | 'manual';
  } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickSurah, setPickSurah] = useState(1);
  const [pickAyah, setPickAyah] = useState(1);
  const [targetsOpen, setTargetsOpen] = useState(false);
  const [newTargetInput, setNewTargetInput] = useState('');
  const [revisionTargetInput, setRevisionTargetInput] = useState('');

  useEffect(() => {
    let alive = true;
    loadSurahList()
      .then((l) => alive && setSurahs(l))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const nameOf = (n: number) => {
    const s = surahs.find((s) => s.number === n);
    return s ? surahDisplayName(s, i18n.language) : `Surah ${n}`;
  };
  const metaOf = (n: number) => surahs.find((s) => s.number === n);
  const ayahCountOf = (n: number) => metaOf(n)?.numberOfAyahs ?? 286;

  const nextNew = queue?.nextNew ?? null;

  const heatmapMax = useMemo(
    () => Math.max(1, ...(summary?.heatmap ?? []).map((h) => h.totalAyat)),
    [summary]
  );

  if (isDemoMode) {
    return (
      <DemoSignInGate
        emoji="🧠"
        title={t('demoGate.hifzTitle', 'Your memorisation journey awaits')}
        desc={t(
          'demoGate.hifzDesc',
          'Your Hifz progress — memorised āyāt, revision schedule, and weak spots — lives in your account.'
        )}
        backTo="/quran"
        backLabel={t('demoGate.backToQuran', 'Back to Quran')}
        tabs={<QuranTabNav active="hifz" />}
      />
    );
  }

  const dueList = queue?.due ?? [];

  return (
    <AnimatedBackground variant="dark">
      <h1 className="sr-only">{t('hifz.title', 'Hifz Tracker')}</h1>
      <div className="max-w-2xl mx-auto px-4 pt-3 pb-16 space-y-4">
        <QuranTabNav active="hifz" />

        {/* Daily targets */}
        <div className="rounded-3xl bg-brand-deep/80 border border-brand-border p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-black">{t('hifz.todayTitle', "Today's targets")}</h2>
            <div className="flex items-center gap-2">
              <span className="text-brand-gold text-xs font-bold">
                🔥 {formatLocaleNumber(summary?.streak ?? 0)}
              </span>
              <button
                onClick={() => {
                  setNewTargetInput(String(summary?.profile.dailyNewTarget ?? 3));
                  setRevisionTargetInput(String(summary?.profile.dailyRevisionTarget ?? 15));
                  setTargetsOpen((v) => !v);
                }}
                className="text-white/30 text-[10px] font-bold uppercase hover:text-white"
              >
                {t('hifz.editTargets', 'Edit')}
              </button>
            </div>
          </div>

          {targetsOpen && (
            <div className="mb-4 p-3 rounded-2xl bg-white/5 border border-brand-border flex flex-col gap-2">
              <label className="flex items-center justify-between text-xs text-white/60">
                {t('hifz.newTargetLabel', 'New ayat / day')}
                <input
                  type="number"
                  min={0}
                  max={200}
                  value={newTargetInput}
                  onChange={(e) => setNewTargetInput(e.target.value)}
                  className="input input-xs w-20 bg-brand-surface border-brand-border text-white text-right"
                />
              </label>
              <label className="flex items-center justify-between text-xs text-white/60">
                {t('hifz.revisionTargetLabel', 'Revisions / day')}
                <input
                  type="number"
                  min={0}
                  max={1000}
                  value={revisionTargetInput}
                  onChange={(e) => setRevisionTargetInput(e.target.value)}
                  className="input input-xs w-20 bg-brand-surface border-brand-border text-white text-right"
                />
              </label>
              <button
                onClick={() => {
                  const dailyNewTarget = Math.max(0, Math.min(200, Number(newTargetInput) || 0));
                  const dailyRevisionTarget = Math.max(
                    0,
                    Math.min(1000, Number(revisionTargetInput) || 0)
                  );
                  updateProfile.mutate(
                    { dailyNewTarget, dailyRevisionTarget },
                    { onSuccess: () => setTargetsOpen(false) }
                  );
                }}
                className="btn btn-xs bg-brand-emerald-dim hover:bg-brand-emerald-dim hover:brightness-90 border-0 text-on-color self-end"
              >
                {t('common.save', 'Save')}
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between text-[10px] text-white/40 mb-1">
                <span>{t('hifz.newLabel', 'New')}</span>
                <span>
                  {formatLocaleNumber(summary?.today.newCount ?? 0)}/
                  {formatLocaleNumber(summary?.profile.dailyNewTarget ?? 0)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full ${summary?.newGoalMet ? 'bg-brand-emerald' : 'bg-gradient-to-r from-brand-emerald/60 to-brand-info/60'}`}
                  style={{
                    width: `${Math.min(100, ((summary?.today.newCount ?? 0) / Math.max(1, summary?.profile.dailyNewTarget ?? 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-white/40 mb-1">
                <span>{t('hifz.revisionLabel', 'Revision')}</span>
                <span>
                  {formatLocaleNumber(summary?.today.revisionCount ?? 0)}/
                  {formatLocaleNumber(summary?.profile.dailyRevisionTarget ?? 0)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full ${summary?.revisionGoalMet ? 'bg-brand-emerald' : 'bg-gradient-to-r from-brand-gold/60 to-brand-emerald/60'}`}
                  style={{
                    width: `${Math.min(100, ((summary?.today.revisionCount ?? 0) / Math.max(1, summary?.profile.dailyRevisionTarget ?? 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Add new memorisation */}
        <div className="rounded-3xl bg-brand-deep/80 border border-brand-border p-5">
          <h2 className="text-white font-black mb-3">
            {t('hifz.addNewTitle', 'Memorise something new')}
          </h2>
          {nextNew ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-white font-bold text-sm">{nameOf(nextNew.surah)}</p>
                <p className="text-white/40 text-xs">
                  {t('hifz.ayahNo', { n: nextNew.ayah, defaultValue: 'Āyah {{n}}' })}
                </p>
              </div>
              <button
                onClick={() =>
                  setLearning({ surah: nextNew.surah, ayah: nextNew.ayah, mode: 'next' })
                }
                className="btn btn-sm bg-brand-emerald-dim hover:bg-brand-emerald-dim hover:brightness-90 border-0 text-on-color"
              >
                {t('hifz.startMemorising', 'Start memorising')}
              </button>
            </div>
          ) : (
            <p className="text-white/40 text-xs">
              {t('hifz.allMemorised', "You've started every āyah in the mushaf — masha'Allah!")}
            </p>
          )}
          <button
            onClick={() => setPickerOpen((v) => !v)}
            className="mt-3 text-brand-emerald text-xs font-bold"
          >
            {pickerOpen
              ? t('hifz.hidePicker', 'Hide')
              : t('hifz.pickDifferent', 'Pick a specific āyah instead →')}
          </button>
          {pickerOpen && (
            <div className="mt-3 p-3 rounded-2xl bg-white/5 border border-brand-border flex flex-wrap items-end gap-2">
              <label className="flex flex-col text-[10px] text-white/40 font-bold uppercase gap-1">
                {t('hifz.surah', 'Surah')}
                <select
                  value={pickSurah}
                  onChange={(e) => {
                    const s = Number(e.target.value);
                    setPickSurah(s);
                    setPickAyah(1);
                  }}
                  className="select select-xs bg-brand-surface border-brand-border text-white w-40"
                >
                  {surahs.map((s) => (
                    <option key={s.number} value={s.number}>
                      {s.number}. {surahDisplayName(s, i18n.language)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col text-[10px] text-white/40 font-bold uppercase gap-1">
                {t('hifz.ayah', 'Āyah')}
                <input
                  type="number"
                  min={1}
                  max={ayahCountOf(pickSurah)}
                  value={pickAyah}
                  onChange={(e) => setPickAyah(Number(e.target.value))}
                  className="input input-xs w-20 bg-brand-surface border-brand-border text-white"
                />
              </label>
              <button
                onClick={() => setLearning({ surah: pickSurah, ayah: pickAyah, mode: 'manual' })}
                className="btn btn-xs bg-brand-emerald-dim hover:bg-brand-emerald-dim hover:brightness-90 border-0 text-on-color"
              >
                {t('hifz.add', 'Add')}
              </button>
            </div>
          )}
        </div>

        {/* Due for revision */}
        <div className="rounded-3xl bg-brand-deep/80 border border-brand-border p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-black">{t('hifz.dueTitle', 'Due for revision')}</h2>
            <span className="text-white/30 text-xs">
              {t('hifz.dueCount', { count: dueList.length, defaultValue: '{{count}} due' })}
            </span>
          </div>
          {dueList.length === 0 ? (
            <p className="text-white/30 text-xs">
              {t('hifz.dueEmpty', "Nothing due right now — you're all caught up.")}
            </p>
          ) : (
            <div className="space-y-1.5">
              {dueList.map((e) => (
                <div
                  key={`${e.surah}-${e.ayah}`}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <button
                    onClick={() => setReviewing(e)}
                    className="flex items-center gap-2 min-w-0 flex-1 text-left"
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${STATE_COLOR[e.state]}`} />
                    <span className="text-white/80 text-xs font-bold truncate">
                      {nameOf(e.surah)}
                    </span>
                    <span className="text-white/30 text-xs shrink-0">
                      {t('hifz.ayahNo', { n: e.ayah, defaultValue: 'Āyah {{n}}' })}
                    </span>
                  </button>
                  <button
                    onClick={() => setReviewing(e)}
                    className="text-brand-emerald text-[10px] font-bold uppercase shrink-0"
                  >
                    {t('hifz.review', 'Review')} →
                  </button>
                  <button
                    aria-label={t(
                      'hifz.removeAria',
                      'Remove {{surah}}:{{ayah}} from memorisation',
                      {
                        surah: e.surah,
                        ayah: e.ayah,
                      }
                    )}
                    onClick={() => setPendingRemove(e)}
                    className="text-white/20 hover:text-red-300 text-xs shrink-0"
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weak-spot heatmap */}
        <div className="rounded-3xl bg-brand-deep/80 border border-brand-border p-5">
          <h2 className="text-white font-black mb-1">
            {t('hifz.heatmapTitle', 'Weak-spot heatmap')}
          </h2>
          <p className="text-white/30 text-[10px] mb-3">
            {t('hifz.heatmapHint', 'Coverage and strength across every surah you have started')}
          </p>
          {(summary?.heatmap ?? []).length === 0 ? (
            <p className="text-white/30 text-xs">
              {t('hifz.heatmapEmpty', 'Start memorising an āyah to see your progress here.')}
            </p>
          ) : (
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5">
              {(summary?.heatmap ?? []).map((row) => {
                const weakPct = row.memorised > 0 ? (row.solid / row.memorised) * 100 : 0;
                return (
                  <div
                    key={row.surah}
                    title={`${nameOf(row.surah)}: ${row.memorised}/${row.totalAyat} started · ${row.solid} solid`}
                    className="aspect-square rounded-md flex items-center justify-center text-[9px] font-bold text-white/70"
                    style={{
                      backgroundColor: `rgba(16, 185, 129, ${0.12 + (weakPct / 100) * 0.55})`,
                      opacity: Math.max(0.35, row.memorised / heatmapMax + 0.35),
                    }}
                  >
                    {row.surah}
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex items-center justify-center gap-4 mt-3 text-[9px] text-white/30">
            {(['new', 'learning', 'consolidating', 'solid'] as const).map((s) => (
              <span key={s} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${STATE_COLOR[s]}`} />
                {t(STATE_LABEL_KEY[s])}
              </span>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-4 gap-2">
          {(['new', 'learning', 'consolidating', 'solid'] as const).map((s) => (
            <div
              key={s}
              className="rounded-2xl bg-brand-deep/80 border border-brand-border p-3 text-center"
            >
              <p className="text-lg font-black text-white">
                {formatLocaleNumber(summary?.totals[s] ?? 0)}
              </p>
              <p className="text-white/30 text-[9px] font-bold uppercase mt-0.5">
                {t(STATE_LABEL_KEY[s])}
              </p>
            </div>
          ))}
        </div>
      </div>

      {learning && (
        <HifzLearnModal
          surah={learning.surah}
          ayah={learning.ayah}
          surahMeta={metaOf(learning.surah)}
          confirming={learning.mode === 'next' ? addNext.isPending : addEntry.isPending}
          onClose={() => setLearning(null)}
          onConfirm={() => {
            if (learning.mode === 'next') {
              addNext.mutate(undefined, { onSuccess: () => setLearning(null) });
            } else {
              addEntry.mutate(
                { surah: learning.surah, ayah: learning.ayah },
                {
                  onSuccess: () => {
                    setLearning(null);
                    setPickerOpen(false);
                  },
                }
              );
            }
          }}
        />
      )}

      {reviewing && (
        <HifzReviewModal
          surah={reviewing.surah}
          ayah={reviewing.ayah}
          surahMeta={metaOf(reviewing.surah)}
          submitting={review.isPending}
          onClose={() => setReviewing(null)}
          onResult={(result: HifzResult) => {
            review.mutate(
              { surah: reviewing.surah, ayah: reviewing.ayah, result },
              { onSuccess: () => setReviewing(null) }
            );
          }}
        />
      )}

      <ConfirmDialog
        open={!!pendingRemove}
        title={t('hifz.removeTitle', 'Remove this āyah from memorisation?')}
        message={
          pendingRemove
            ? t(
                'hifz.removeMsg',
                '{{surah}}, āyah {{ayah}} and its revision progress will be deleted.',
                {
                  surah: nameOf(pendingRemove.surah),
                  ayah: pendingRemove.ayah,
                }
              )
            : ''
        }
        confirmLabel={t('hifz.yesRemove', 'Yes, remove')}
        onConfirm={() => {
          if (pendingRemove) removeEntry.mutate(pendingRemove);
          setPendingRemove(null);
        }}
        onCancel={() => setPendingRemove(null)}
      />
    </AnimatedBackground>
  );
}
