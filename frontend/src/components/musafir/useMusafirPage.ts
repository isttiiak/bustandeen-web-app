import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { getTrackingDay } from '../../utils/trackingDay.js';
import { formatLocaleDate } from '../../utils/localeDate.js';
import { celebrateSmall, celebrateGoal } from '../../utils/celebrate.js';
import { type PrayerId } from '../../hooks/useSalatLog.js';
import {
  useMusafir,
  startMusafir,
  updateMusafir,
  endMusafir,
  defaultSchool,
  journeyDay,
  schoolMeta,
  staysAsResident,
  jamAllowed,
  getMusafirHistory,
  getDuasSaid,
  suggestStartAfter,
  setDuasSaid,
  FARD_RAKAT,
  travelRakat,
  MUSAFIR_DUAS,
  type MusafirSchool,
  type PastJourney,
} from '../../utils/musafir.js';
import { PRAYERS } from './musafirShared.js';

/** The Musafir screen's state: the journey form, ending a journey, the du'a checklist and the open cards. */
export function useMusafirPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const bn = lang === 'bn';
  const today = getTrackingDay();
  const musafir = useMusafir();

  // setup / edit form
  const [formOpen, setFormOpen] = useState(false);
  const [destination, setDestination] = useState('');
  const [plannedStay, setPlannedStay] = useState<number>(0);
  const [school, setSchool] = useState<MusafirSchool>(() => defaultSchool());
  // When the journey began: a date plus the last prayer prayed at home that day
  // (for a sudden trip logged later). Unset = left before Fajr.
  const [startDate, setStartDate] = useState(today);
  const [startAfter, setStartAfter] = useState<PrayerId | undefined>(undefined);
  const openForm = () => {
    setStartDate(musafir?.startedAt ?? today);
    setStartAfter(musafir ? musafir.startAfter : suggestStartAfter(today));
    setDestination(musafir?.destination ?? '');
    setPlannedStay(musafir?.plannedStay ?? 0);
    setSchool(musafir?.school ?? defaultSchool());
    setFormOpen(true);
  };
  const submitForm = () => {
    if (musafir) {
      updateMusafir({
        startedAt: startDate <= today ? startDate : today,
        startAfter,
        destination: destination.trim() || undefined,
        plannedStay,
        school,
      });
      toast.success(t('musafir.updated', 'Journey updated'));
    } else {
      startMusafir({ today, startedAt: startDate, startAfter, destination, plannedStay, school });
      celebrateSmall();
      toast.success(t('musafir.started', 'Safe travels! Musafir mode is on.'), {
        duration: 3500,
      });
    }
    setFormOpen(false);
  };

  // ending the journey
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null);
  const [returned, setReturned] = useState<PastJourney | null>(null);
  const finishJourney = () => {
    setConfirmEnd(false);
    const trip = endMusafir(today);
    setReturned(trip);
    celebrateGoal();
  };

  // du'a checklist
  const [said, setSaid] = useState<string[]>(() => getDuasSaid(today));
  const [openDua, setOpenDua] = useState<string | null>('riding');
  const toggleSaid = (id: string) => {
    const next = said.includes(id) ? said.filter((x) => x !== id) : [...said, id];
    setSaid(next);
    setDuasSaid(today, next);
    if (!said.includes(id)) {
      if (next.length === MUSAFIR_DUAS.length) celebrateGoal();
      else celebrateSmall();
    }
  };

  const [openRuling, setOpenRuling] = useState<string | null>(null);
  // Small localStorage read; re-evaluated on every render so it follows start/end.
  const history = getMusafirHistory();

  const active = !!musafir;
  const day = musafir ? journeyDay(musafir, today) : 0;
  const meta = schoolMeta(musafir?.school ?? school);
  const resident = musafir ? staysAsResident(musafir) : false;
  const canJoin = jamAllowed(musafir?.school ?? school);
  const savedRakat = PRAYERS.reduce((n, p) => n + FARD_RAKAT[p.id] - travelRakat(p.id), 0);
  const saidCount = said.length;

  // A forgotten trip can be back-dated up to 60 days.
  const minStartDate = (() => {
    const d = new Date(`${today}T12:00:00`);
    d.setDate(d.getDate() - 60);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const fmtDate = (d: string) =>
    formatLocaleDate(new Date(d + 'T12:00:00'), { day: 'numeric', month: 'short' });

  return {
    today,
    musafir,
    formOpen,
    setFormOpen,
    destination,
    setDestination,
    plannedStay,
    setPlannedStay,
    school,
    setSchool,
    startDate,
    setStartDate,
    startAfter,
    setStartAfter,
    openForm,
    submitForm,
    confirmEnd,
    setConfirmEnd,
    deleteIdx,
    setDeleteIdx,
    returned,
    setReturned,
    finishJourney,
    said,
    saidCount,
    openDua,
    setOpenDua,
    toggleSaid,
    openRuling,
    setOpenRuling,
    history,
    active,
    day,
    meta,
    resident,
    canJoin,
    savedRakat,
    minStartDate,
    fmtDate,
    lang,
    bn,
  };
}

export type MusafirPage = ReturnType<typeof useMusafirPage>;
