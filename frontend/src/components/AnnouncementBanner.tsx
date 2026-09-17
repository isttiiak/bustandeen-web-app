import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useActiveAnnouncement } from '../hooks/useAnnouncement.js';

const DISMISSED_KEY = 'bustandeen_dismissed_announcement';

/** Per-viewer convenience only (which announcement id was dismissed) — never
 * shared state, never read back by the server. Same pattern as other
 * per-viewer localStorage use in this app. */
function readDismissed(): string | null {
  try {
    return localStorage.getItem(DISMISSED_KEY);
  } catch {
    return null;
  }
}

export default function AnnouncementBanner() {
  const { data: announcement } = useActiveAnnouncement();
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  useEffect(() => {
    setDismissedId(readDismissed());
  }, []);

  if (!announcement || announcement.id === dismissedId) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, announcement.id);
    } catch {
      // ignore — private mode / blocked storage, just won't persist
    }
    setDismissedId(announcement.id);
  };

  return (
    <div className="sticky top-0 z-[45] flex items-center justify-center gap-3 px-4 py-2 bg-brand-emerald/15 border-b border-brand-emerald/20 text-sm backdrop-blur-sm">
      <span className="text-white/90 font-semibold truncate">{announcement.title}</span>
      <span className="text-white/50 hidden sm:inline truncate">{announcement.body}</span>
      <button
        onClick={dismiss}
        className="shrink-0 p-1 rounded-full hover:bg-white/10 transition-colors"
        aria-label="Dismiss"
      >
        <XMarkIcon className="w-4 h-4 text-white/60" />
      </button>
    </div>
  );
}
