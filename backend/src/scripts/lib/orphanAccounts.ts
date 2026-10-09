import type { Model } from 'mongoose';

type AnyModel = Model<Record<string, unknown>>;
import User from '../../models/User.js';
import ZikrDaily from '../../models/ZikrDaily.js';
import ZikrGoal from '../../models/ZikrGoal.js';
import ZikrStreak from '../../models/ZikrStreak.js';
import ZikrEvent from '../../models/ZikrEvent.js';
import SalatLog from '../../models/SalatLog.js';
import SalatDebt from '../../models/SalatDebt.js';
import SalatDebtEvent from '../../models/SalatDebtEvent.js';
import KazaUnit from '../../models/KazaUnit.js';
import FastingLog from '../../models/FastingLog.js';
import FastingProfile from '../../models/FastingProfile.js';
import AdhkarDay from '../../models/AdhkarDay.js';
import QuranLog from '../../models/QuranLog.js';
import QuranProfile from '../../models/QuranProfile.js';
import QuranReadingSession from '../../models/QuranReadingSession.js';
import HifzEntry from '../../models/HifzEntry.js';
import HifzProfile from '../../models/HifzProfile.js';
import HifzLog from '../../models/HifzLog.js';
import CycleLog from '../../models/CycleLog.js';
import CycleDay from '../../models/CycleDay.js';
import CycleProfile from '../../models/CycleProfile.js';
import NaseehPlan from '../../models/NaseehPlan.js';
import ClientOp from '../../models/ClientOp.js';
import SocialProfile from '../../models/SocialProfile.js';
import FeedbackMessage from '../../models/FeedbackMessage.js';
import ZikrRequest from '../../models/ZikrRequest.js';
import Donation from '../../models/Donation.js';
import UpdateEmailCampaign from '../../models/UpdateEmailCampaign.js';
import { DELETED_ACCOUNT_ID } from '../../services/user.service.js';

/**
 * Accounts deleted before v5.128.1 left rows behind (see deleteAccount). An
 * orphan is a uid referenced by any of these paths that has no User row.
 * Every path here must also be handled by purgeAccountData().
 */
export const ORPHAN_SOURCES: { label: string; model: AnyModel; path: string }[] = [
  ...(
    [
      ZikrDaily,
      ZikrGoal,
      ZikrStreak,
      ZikrEvent,
      SalatLog,
      SalatDebt,
      SalatDebtEvent,
      KazaUnit,
      FastingLog,
      FastingProfile,
      AdhkarDay,
      QuranLog,
      QuranProfile,
      QuranReadingSession,
      HifzEntry,
      HifzProfile,
      HifzLog,
      CycleLog,
      CycleDay,
      CycleProfile,
      NaseehPlan,
      SocialProfile,
      FeedbackMessage,
      ZikrRequest,
      Donation,
    ] as unknown as AnyModel[]
  ).map((model) => ({ label: model.modelName, model, path: 'userId' })),
  { label: 'ClientOp', model: ClientOp as unknown as AnyModel, path: 'uid' },
  ...['friends', 'pendingIncoming', 'pendingOutgoing', 'blocked'].map((path) => ({
    label: `SocialProfile.${path}`,
    model: SocialProfile as unknown as AnyModel,
    path,
  })),
  {
    label: 'UpdateEmailCampaign.recipients',
    model: UpdateEmailCampaign as unknown as AnyModel,
    path: 'recipients.uid',
  },
];

/** Values that look like uids but are placeholders, never accounts. */
function isPlaceholder(uid: unknown): boolean {
  return (
    typeof uid !== 'string' ||
    uid === '' ||
    uid === DELETED_ACCOUNT_ID ||
    // Update-email custom recipients that never had an account.
    uid.startsWith('custom:')
  );
}

export interface OrphanReport {
  /** Orphan uids, sorted. */
  uids: string[];
  /** Per source: how many documents reference at least one orphan uid. */
  counts: { label: string; docs: number }[];
}

export async function findOrphans(): Promise<OrphanReport> {
  const live = new Set<string>((await User.distinct('uid')) as string[]);
  const orphans = new Set<string>();
  for (const { model, path } of ORPHAN_SOURCES) {
    for (const uid of (await model.distinct(path)) as unknown[]) {
      if (!isPlaceholder(uid) && !live.has(uid as string)) orphans.add(uid as string);
    }
  }
  const uids = [...orphans].sort();
  const counts = [];
  for (const { label, model, path } of ORPHAN_SOURCES) {
    const docs = uids.length ? await model.countDocuments({ [path]: { $in: uids } }) : 0;
    counts.push({ label, docs });
  }
  return { uids, counts };
}
