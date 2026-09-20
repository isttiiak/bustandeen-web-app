// Shared API response types

export interface ZikrTypeItem {
  _id: string;
  name: string;
  createdAt: string;
}

export interface ZikrSummaryResponse {
  ok: boolean;
  totalCount: number;
  perType: Array<{ zikrType: string; total: number }>;
  types: ZikrTypeItem[];
}

export interface ChartDataPoint {
  date: string;
  total: number;
  breakdown: Record<string, number>;
  /** Streak status for the day (from analytics): met | pending | grace | missed */
  status?: 'met' | 'pending' | 'grace' | 'missed';
}

export type StreakState = 'active' | 'grace' | 'none' | 'paused';

export interface ZikrGoal {
  userId?: string;
  dailyTarget: number;
  isActive: boolean;
  /** Consecutive missed days forgiven before the streak resets (0-3, default 1). */
  graceDays: number;
}

export interface ZikrStreak {
  userId?: string;
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate?: string | null;
  isPaused?: boolean;
  pausedAt?: string | null;
  /** Derived live state: active (🔥) / grace (🧊 last chance) / none (0) / paused */
  state?: StreakState;
  count?: number; // alias used in some response shapes
}

export interface AnalyticsResponse {
  ok: boolean;
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
  chartData: ChartDataPoint[];
  stats: {
    average: number;
    maxDay: string | null;
    maxCount: number;
    total: number;
  };
  today: {
    total: number;
    goalMet: boolean;
    perType: Array<{ zikrType: string; total: number }>;
  };
  goal: ZikrGoal;
  streak: ZikrStreak;
  allTime: {
    totalCount: number;
    bestDay: { date: string | null; count: number };
  };
  perType: Array<{ zikrType: string; total: number }>;
}

export interface ZikrTimeOfDayResponse {
  ok: boolean;
  hours: Array<{ hour: number; total: number }>;
}

export interface ZikrSession {
  start: string;
  end: string;
  total: number;
  perType: Record<string, number>;
  /** Counts typed in afterwards ("Log missed counts"): no real clock time. */
  manual?: boolean;
}

export interface ZikrSessionsResponse {
  ok: boolean;
  sessions: ZikrSession[];
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoUrl?: string;
  firstName?: string;
  lastName?: string;
  occupation?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_say';
  birthDate?: string;
  aiEnabled?: boolean;
  totalCount?: number;
  zikrTypes?: ZikrTypeItem[];
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoUrl?: string | null;
  emailVerified?: boolean;
  /** From the DB profile — gates the Rayhanah Cycle entry (female only) */
  gender?: 'male' | 'female' | 'other' | 'prefer_not_say';
  /** Computed server-side from ADMIN_EMAILS on each /verify or /user/me call
   *  — never stored, so it's always in sync with the env var. Gates /admin/sadaqah. */
  isAdmin?: boolean;
}

export type SadaqahPaymentMethod = 'bkash' | 'nagad';
export type DonationStatus = 'pending' | 'verified' | 'rejected';

export interface Donation {
  _id: string;
  donorName: string | null;
  onBehalfOf: string | null;
  email: string;
  phone: string;
  paymentMethod: SadaqahPaymentMethod;
  transactionId: string;
  amount: number;
  transactionDate: string;
  message: string | null;
  showNamePublicly: boolean;
  isAnonymous: boolean;
  userId: string | null;
  status: DonationStatus;
  verifiedAt: string | null;
  verifiedBy: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuarterlyEntry {
  quarter: string;
  received: number;
  spent: number;
  notes: string;
}

export interface DonationStatsResponse {
  ok: boolean;
  totalVerifiedAmount: number;
  totalVerifiedCount: number;
  /** Distinct people who have given at least once verified donation — not
   *  distinct donations, so a repeat donor counts once. Shown publicly
   *  instead of a money figure. */
  totalContributors: number;
  lastUpdated: string;
  quarterlyBreakdown: QuarterlyEntry[];
}

export interface SadaqahExpense {
  _id: string;
  date: string;
  amount: number;
  description: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SadaqahConfigResponse {
  ok: boolean;
  bkashNumber: string | null;
  nagadNumber: string | null;
  nagadEnabled: boolean;
}

export interface SubmitDonationRequest {
  donorName?: string;
  onBehalfOf?: string;
  email: string;
  phone: string;
  paymentMethod: SadaqahPaymentMethod;
  transactionId: string;
  amount: number;
  transactionDate: string;
  message?: string;
  showNamePublicly?: boolean;
  isAnonymous?: boolean;
}
