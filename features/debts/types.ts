export type DebtType = 'owed_to_me' | 'i_owe';
export type DebtStatus = 'pending' | 'partial' | 'paid' | 'overdue';
export type RecurrenceFrequency = 'weekly' | 'monthly' | 'yearly';
export type InterestStartMode = 'immediate' | 'after_due';
export type InterestAccrualFrequency = 'monthly' | 'yearly';

export interface DebtPayment {
  id: string;
  amountMinor: number;
  interestAppliedMinor: number;
  principalAppliedMinor: number;
  paidAt: string;
  note?: string;
}

export interface Debt {
  id: string;
  personName: string;
  principalMinor: number;
  type: DebtType;
  note?: string;
  dueDate?: string;
  status: 'pending' | 'paid';
  interestRateBps?: number;
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
  interestRateBps?: number;
  interestStartMode?: InterestStartMode;
  interestAccrualFrequency?: InterestAccrualFrequency;
  isRecurring?: boolean;
  recurrenceInterval?: RecurrenceFrequency;
}

export interface RecordPaymentInput {
  amount: number;
  note?: string;
}
