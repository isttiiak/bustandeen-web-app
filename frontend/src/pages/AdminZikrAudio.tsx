import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
import { ZIKR_LIBRARY } from '../utils/zikrLibrary.js';
import {
  useZikrAudioStatus,
  useSetCuratedAudio,
  useSetLibraryItemAudio,
} from '../hooks/useAdminZikrAudio.js';

interface Row {
  key: string;
  name: string;
  audioUrl?: string;
  kind: 'curated' | 'library';
  libraryId?: string;
}

function AudioRow({ row }: { row: Row }) {
  const { t } = useTranslation();
  const setCurated = useSetCuratedAudio();
  const setLibrary = useSetLibraryItemAudio();
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState(row.audioUrl ?? '');

  const save = () => {
    if (!url.trim()) return;
    if (row.kind === 'curated') {
      setCurated.mutate(
        { name: row.name, audioUrl: url.trim() },
        { onSuccess: () => setEditing(false) }
      );
    } else if (row.libraryId) {
      setLibrary.mutate(
        { id: row.libraryId, audioUrl: url.trim() },
        { onSuccess: () => setEditing(false) }
      );
    }
  };
  const pending = setCurated.isPending || setLibrary.isPending;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/5 py-2 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-white text-sm truncate">{row.name}</p>
        <span
          className={`text-[10px] font-bold uppercase tracking-wide ${
            row.kind === 'curated' ? 'text-white/30' : 'text-brand-emerald/60'
          }`}
        >
          {row.kind}
        </span>
      </div>
      {!editing ? (
        <div className="flex items-center gap-2 shrink-0">
          {row.audioUrl ? (
            <span className="text-brand-emerald text-xs font-bold">
              {t('adminZikrAudio.hasAudio', '✓ has audio')}
            </span>
          ) : (
            <span className="text-brand-gold/70 text-xs">
              {t('adminZikrAudio.missing', 'missing')}
            </span>
          )}
          <button
            onClick={() => setEditing(true)}
            className="btn btn-xs bg-white/5 border border-white/10 text-white/60"
          >
            {row.audioUrl ? t('adminSadaqah.edit', 'Edit') : t('adminZikrAudio.add', 'Add')}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 shrink-0">
          <input
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            className="input input-xs w-40 bg-white/5 border-brand-emerald/15 text-white rounded-lg"
          />
          <button
            onClick={save}
            disabled={pending || !url.trim()}
            className="btn btn-xs rounded-lg bg-brand-emerald border-brand-emerald text-white font-bold"
          >
            {pending ? '…' : t('adminSadaqah.save', 'Save')}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="btn btn-xs btn-ghost rounded-lg text-white/50"
          >
            {t('adminZikr.cancel', 'Cancel')}
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminZikrAudio() {
  const { t } = useTranslation();
  const { data, isLoading } = useZikrAudioStatus();
  const [onlyMissing, setOnlyMissing] = useState(false);

  const curatedNames = ZIKR_LIBRARY.flatMap((cat) => cat.items.map((i) => i.name));
  const curatedByName = new Map((data?.curated ?? []).map((a) => [a.name, a.audioUrl]));

  const rows: Row[] = [
    ...curatedNames.map((name) => ({
      key: `curated:${name}`,
      name,
      audioUrl: curatedByName.get(name),
      kind: 'curated' as const,
    })),
    ...(data?.libraryItems ?? []).map((item) => ({
      key: `library:${item._id}`,
      name: item.name,
      audioUrl: item.audioUrl,
      kind: 'library' as const,
      libraryId: item._id,
    })),
  ];

  const visibleRows = onlyMissing ? rows.filter((r) => !r.audioUrl) : rows;
  const missingCount = rows.filter((r) => !r.audioUrl).length;

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('adminZikrAudio.seoTitle', 'Zikr Audio Tracker')}
        description="Internal dashboard."
        path="/admin/zikr-audio"
        index={false}
      />
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-white">
            {t('adminZikrAudio.title', 'Zikr audio tracker')}
          </h1>
          <p className="text-sm text-white/50 mt-1">
            {t(
              'adminZikrAudio.subtitle',
              'Paste an audio recitation URL for a curated or community zikr — {{count}} still missing.',
              { count: missingCount }
            )}
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm text-white/60">
          <input
            type="checkbox"
            checked={onlyMissing}
            onChange={(e) => setOnlyMissing(e.target.checked)}
            className="checkbox checkbox-xs"
          />
          {t('adminZikrAudio.onlyMissing', 'Only show missing')}
        </label>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          {isLoading && <p className="text-white/30 text-sm">{t('common.loading', 'Loading…')}</p>}
          {!isLoading && visibleRows.map((row) => <AudioRow key={row.key} row={row} />)}
        </div>
      </div>
    </AnimatedBackground>
  );
}
