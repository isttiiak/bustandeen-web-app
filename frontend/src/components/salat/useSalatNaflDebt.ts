import { NAFL_TYPE_META, type PrayerId, type NaflType } from '../../hooks/useSalatLog.js';
import { MIN_RAKAT, todayStr } from './salatParts.js';
import type { SalatTrackerState } from './useSalatTrackerState.js';

// Audit P4-1: the kaza debt edit and the nafl handlers, moved verbatim from
// pages/SalatTracker.tsx. Plain functions, recreated every render like before.
export function useSalatNaflDebt(s: SalatTrackerState) {
  const {
    user,
    setShowGuestDialog,
    debt,
    setDebtDrafts,
    setDebtExact,
    log,
    rakatOverrides,
    setRakatOverrides,
    updateNafl,
    selectedDate,
    setNaflExpanded,
  } = s;

  const commitDebtEdit = (prayer: PrayerId, rawValue: string) => {
    setDebtDrafts((d) => {
      const next = { ...d };
      delete next[prayer];
      return next;
    });
    const current = debt?.owed[prayer] ?? 0;
    const count = Math.max(0, Math.min(9999, parseInt(rawValue, 10) || 0));
    if (count === current) return; // no real change — don't spam a request
    if (!user) {
      setShowGuestDialog(true);
      return;
    }
    setDebtExact.mutate({ prayer, count, date: todayStr() });
  };

  const naflEntry = log?.nafl ?? { completed: false, types: [], rakat: 2 };

  const getTypeRakat = (type: NaflType): number => {
    if (type in rakatOverrides) return rakatOverrides[type];
    const meta = NAFL_TYPE_META.find((m) => m.id === type);
    return meta?.defaultRakat ?? MIN_RAKAT;
  };

  const naflTotalRakat = (naflEntry.types ?? []).reduce((s, nt) => s + getTypeRakat(nt), 0);

  const handleNaflToggle = () => {
    if (!user) {
      setShowGuestDialog(true);
      return;
    }
    const newCompleted = !naflEntry.completed;
    const keptTypes = newCompleted ? (naflEntry.types ?? []) : [];
    if (!newCompleted) setRakatOverrides({});
    updateNafl.mutate({
      completed: newCompleted,
      types: keptTypes,
      rakat: newCompleted
        ? keptTypes.length > 0
          ? keptTypes.reduce((s, nt) => s + getTypeRakat(nt), 0)
          : MIN_RAKAT
        : MIN_RAKAT,
      date: selectedDate,
    });
    if (newCompleted) setNaflExpanded(true);
    else setNaflExpanded(false);
  };

  const handleNaflTypeToggle = (type: NaflType) => {
    if (!user) {
      setShowGuestDialog(true);
      return;
    }
    const currentTypes = naflEntry.types ?? [];
    const adding = !currentTypes.includes(type);
    const next = adding ? [...currentTypes, type] : currentTypes.filter((nt) => nt !== type);
    if (!adding) {
      setRakatOverrides((prev) => {
        const n = { ...prev };
        delete n[type];
        return n;
      });
    }
    const newTotal = next.reduce((s, nt) => s + getTypeRakat(nt), 0);
    updateNafl.mutate({
      completed: naflEntry.completed,
      types: next,
      rakat: Math.max(MIN_RAKAT, newTotal),
      date: selectedDate,
    });
  };

  const handleTypeRakat = (type: NaflType, delta: number) => {
    if (!user) {
      setShowGuestDialog(true);
      return;
    }
    const current = getTypeRakat(type);
    const next = Math.max(MIN_RAKAT, current + delta * 2);
    setRakatOverrides((prev) => ({ ...prev, [type]: next }));
    const types = naflEntry.types ?? [];
    const newTotal = types.reduce((s, nt) => s + (nt === type ? next : getTypeRakat(nt)), 0);
    updateNafl.mutate({
      completed: naflEntry.completed,
      types,
      rakat: newTotal,
      date: selectedDate,
    });
  };

  return {
    commitDebtEdit,
    naflEntry,
    getTypeRakat,
    naflTotalRakat,
    handleNaflToggle,
    handleNaflTypeToggle,
    handleTypeRakat,
  };
}
