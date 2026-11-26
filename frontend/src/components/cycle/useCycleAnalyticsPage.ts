import { useMemo, useState } from 'react';
import {
  useAddPastCycle,
  useBodyStats,
  useCycleSummary,
  useDeleteCycleLog,
  useIsFemale,
} from '../../hooks/useCycle.js';
import { useEscapeKey } from '../../hooks/useEscapeKey.js';
import { useFastingSummary } from '../../hooks/useFasting.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { useUiStore } from '../../store/useUiStore.js';
import { getTrackingDay } from '../../utils/trackingDay.js';
import { computeCycleStats } from '../../utils/cycleStats.js';
import type { CycleEditTarget } from '../CycleEditModal.js';

/** The Rayhanah analytics screen's queries, dialogs' state and statistics. */
export function useCycleAnalyticsPage() {
  const user = useAuthStore((s) => s.user);
  const isFemale = useIsFemale();
  const today = getTrackingDay();

  const { data: summary, isLoading } = useCycleSummary();
  const { data: fastingSummary } = useFastingSummary();
  const { data: bodyStats } = useBodyStats();
  const hideBmi = useUiStore((s) => s.hideBmi);
  const addPast = useAddPastCycle();
  const deleteLog = useDeleteCycleLog();

  const [settingsOpen, setSettingsOpen] = useState(false);

  const [pastOpen, setPastOpen] = useState(false);
  useEscapeKey(() => setPastOpen(false), pastOpen);
  const [pastStart, setPastStart] = useState('');
  const [pastEnd, setPastEnd] = useState('');
  const [pastType, setPastType] = useState<'hayd' | 'nifas'>('hayd');
  const [editTarget, setEditTarget] = useState<CycleEditTarget | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; label: string } | null>(null);

  const stats = useMemo(() => computeCycleStats(summary, today), [summary, today]);

  return {
    user,
    isFemale,
    today,
    summary,
    isLoading,
    fastingSummary,
    bodyStats,
    hideBmi,
    addPast,
    deleteLog,
    settingsOpen,
    setSettingsOpen,
    pastOpen,
    setPastOpen,
    pastStart,
    setPastStart,
    pastEnd,
    setPastEnd,
    pastType,
    setPastType,
    editTarget,
    setEditTarget,
    pendingDelete,
    setPendingDelete,
    stats,
  };
}
