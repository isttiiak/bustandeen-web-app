import Donation from '../../models/Donation.js';
import DonationStats from '../../models/DonationStats.js';
import { STATS_ID } from '../../services/sadaqah.service.js';

/**
 * READ-ONLY check that the cached public totals match the donations behind them
 * (audit 2026-11-16 P1-9). `DonationStats` keeps a running total next to the
 * verified `Donation` rows; before v5.190.15 a failure between the two writes
 * could leave them apart. This reports the difference and writes nothing, so a
 * person decides what to do with it.
 */
export interface DonationStatsDrift {
  cached: { totalVerifiedAmount: number; totalVerifiedCount: number };
  actual: { totalVerifiedAmount: number; totalVerifiedCount: number };
  /** actual - cached: what the cache would have to change by. */
  difference: { amount: number; count: number };
  inSync: boolean;
}

export async function reportDonationStatsDrift(): Promise<DonationStatsDrift> {
  const [stats, agg] = await Promise.all([
    DonationStats.findOne({ _id: STATS_ID }).lean(),
    Donation.aggregate<{ amount: number; count: number }>([
      { $match: { status: 'verified' } },
      { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
  ]);
  const cached = {
    totalVerifiedAmount: stats?.totalVerifiedAmount ?? 0,
    totalVerifiedCount: stats?.totalVerifiedCount ?? 0,
  };
  const actual = {
    totalVerifiedAmount: agg[0]?.amount ?? 0,
    totalVerifiedCount: agg[0]?.count ?? 0,
  };
  const difference = {
    amount: actual.totalVerifiedAmount - cached.totalVerifiedAmount,
    count: actual.totalVerifiedCount - cached.totalVerifiedCount,
  };
  return { cached, actual, difference, inSync: difference.amount === 0 && difference.count === 0 };
}
