import {
  PaperClipIcon,
  ScaleIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { DropIcon, LeafIcon, Star8Icon, TasbihIcon } from '../icons/IslamicIcons.js';
import type { GlobalZikrCategory } from '../../hooks/useZikrRequests.js';

type Icon = (p: { className?: string }) => React.ReactNode;

/** SVG marks for the zikr library categories (audit T3.2: no emoji in
 *  redesigned screens). The `emoji` field of utils/zikrLibrary.ts stays as data. */
export const ZIKR_CATEGORY_ICON: Record<GlobalZikrCategory, Icon> = {
  tasbih: TasbihIcon,
  istighfar: DropIcon,
  salawat: Star8Icon,
  kalimat: ScaleIcon,
  asma: SparklesIcon,
  protection: ShieldCheckIcon,
  uncategorized: PaperClipIcon,
};

/** The community-suggested group. */
export const COMMUNITY_ICON: Icon = LeafIcon;
