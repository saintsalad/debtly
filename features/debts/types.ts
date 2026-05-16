export type DebtType = 'owed_to_me' | 'i_owe';
export type DebtStatus = 'pending' | 'partial' | 'paid' | 'overdue';
export type RecurrenceFrequency = 'weekly' | 'monthly' | 'yearly';
export type InterestStartMode = 'immediate' | 'after_due';
export type InterestAccrualFrequency = 'monthly' | 'yearly';
export type InterestType = 'simple' | 'compound';

export interface DebtPayment {
  id: string;
  amountMinor: number;
  interestAppliedMinor: number;
  principalAppliedMinor: number;
  paidAt: string;
  note?: string;
}

export type DebtSourceType = 'group' | 'personal_split';

export interface Debt {
  id: string;
  personName: string;
  principalMinor: number;
  type: DebtType;
  sourceType?: DebtSourceType;
  sourceGroupId?: string;
  sourceMemberId?: string;
  /** Links multiple debts created from a single split entry. */
  splitGroupId?: string;
  note?: string;
  dueDate?: string;
  /** When set, the debt is inactive (not counted in balances) until this date. */
  startDate?: string;
  status: 'pending' | 'paid';
  interestRateBps?: number;
  interestType?: InterestType;
  interestStartMode?: InterestStartMode;
  interestAccrualFrequency?: InterestAccrualFrequency;
  interestStartDate?: string;
  accruedInterestMinor?: number;
  interestPaidMinor?: number;
  principalPaidMinor?: number;
  paidAt?: string;
  isRecurring?: boolean;
  recurrenceInterval?: RecurrenceFrequency;
  recurrenceAnchorDate?: string;
  nextCycleDate?: string;
  lastGeneratedAt?: string;
  recurringGroupId?: string;
  recurringSourceId?: string;
  /** When true, unpaid balance (and unpaid interest) rolls into the next recurring cycle. */
  carryOverBalance?: boolean;
  /** Minor-unit carry-over amount stored on a settled recurring cycle. */
  carryOverMinor?: number;
  /** Total minor amount for an instalment plan (sum of all cycles). */
  instalmentTotal?: number;
  /** Total number of instalments in the plan. */
  instalmentCount?: number;
  /** 1-based index of this cycle within the instalment plan. */
  instalmentIndex?: number;
  /** Per-entry currency code when different from the app's base currency. */
  currency?: string;
  /** Amount in the original foreign currency (minor units). */
  originalAmountMinor?: number;
  /** Conversion rate used: originalAmount × conversionRate = principalMinor / 100. */
  conversionRate?: number;
  payments?: DebtPayment[];
  createdAt: string;
  updatedAt: string;
  recurrenceFrequency?: RecurrenceFrequency;
}

export interface AddDebtInput {
  personName: string;
  amount: number;
  type: DebtType;
  note?: string;
  dueDate?: string;
  /** When set, debt is inactive until this date. */
  startDate?: string;
  interestRateBps?: number;
  interestType?: InterestType;
  interestStartMode?: InterestStartMode;
  interestAccrualFrequency?: InterestAccrualFrequency;
  isRecurring?: boolean;
  recurrenceInterval?: RecurrenceFrequency;
  /** When true, unpaid balance rolls into the next recurring cycle. */
  carryOverBalance?: boolean;
  /** Total amount for an instalment plan. When set, amount = instalmentTotal / instalmentCount. */
  instalmentTotal?: number;
  /** Number of instalments in the plan. */
  instalmentCount?: number;
  /** For splitting one payment across multiple people (owed_to_me only). */
  splitPeople?: string[];
}

export interface RecordPaymentInput {
  amount: number;
  note?: string;
}
