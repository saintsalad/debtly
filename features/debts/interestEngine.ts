import { ENTER_DEBT_NAME, ENTER_TWO_NAMES_TO_SPLIT } from '@/features/debts/copy';
import { AddDebtInput, Debt, RecurrenceFrequency } from '@/features/debts/types';
import { MAX_INTEREST_RATE_BPS, majorToMinor } from '@/features/debts/money';
import { toLocalDateString } from '@/features/debts/dates';

export type InterestStartMode = 'immediate' | 'after_due';
export type InterestAccrualFrequency = 'monthly' | 'yearly';

export const DEFAULT_INTEREST_START_MODE: InterestStartMode = 'immediate';
export const DEFAULT_INTEREST_ACCRUAL_FREQUENCY: InterestAccrualFrequency = 'monthly';

export function interestRateToBps(ratePercent: number): number {
  return Math.round(ratePercent * 100);
}

export function interestRateFromBps(rateBps: number): number {
  return rateBps / 100;
}

export function validateInterestRateBps(rateBps?: number): string | null {
  if (rateBps == null) return 'Interest rate is required when interest is enabled.';
  if (!Number.isInteger(rateBps) || rateBps <= 0) return 'Interest rate must be greater than 0.';
  if (rateBps > MAX_INTEREST_RATE_BPS) return 'Interest rate exceeds the allowed maximum.';
  return null;
}

export function resolveInterestStartDate(
  debt: Pick<Debt, 'interestStartDate' | 'interestStartMode' | 'createdAt' | 'dueDate'>
): string | undefined {
  if (debt.interestStartDate) return debt.interestStartDate;
  if (debt.interestStartMode === 'after_due' && debt.dueDate) {
    return toLocalDateString(debt.dueDate);
  }
  return toLocalDateString(debt.createdAt);
}

function trimmedSplitPeople(input: AddDebtInput): string[] {
  return (input.splitPeople ?? []).map((p) => p.trim()).filter(Boolean);
}

export function validateAddDebtInput(input: AddDebtInput): string | null {
  const splitNames = trimmedSplitPeople(input);
  const splitAcrossMultiple = splitNames.length >= 2;

  if (!splitAcrossMultiple && !input.personName.trim()) {
    return ENTER_DEBT_NAME;
  }

  if ((input.splitPeople?.length ?? 0) > 0 && splitNames.length === 1) {
    return ENTER_TWO_NAMES_TO_SPLIT;
  }

  const principalMinor = majorToMinor(input.amount);
  if (principalMinor <= 0) return 'Enter an amount greater than 0.';

  if (input.interestRateBps != null) {
    const interestError = validateInterestRateBps(input.interestRateBps);
    if (interestError) return interestError;
    if (input.interestStartMode === 'after_due' && !input.dueDate) {
      return 'A due date is required when interest starts after the due date.';
    }
  }

  if (input.isRecurring) {
    if (!input.dueDate) return 'Recurring debts require a due date.';
    if (!input.recurrenceInterval) return 'Choose how often the debt repeats.';
    if (
      input.instalmentCount != null &&
      input.instalmentCount >= 2 &&
      input.carryOverBalance
    ) {
      return 'Carry-over unavailable with instalment plans — payments are scheduled up front.';
    }
  }

  if (
    splitAcrossMultiple &&
    input.instalmentCount != null &&
    input.instalmentCount >= 2
  ) {
    return 'Instalment plan cannot be combined with splitting across multiple people.';
  }

  return null;
}

export function buildInterestFields(
  input: AddDebtInput,
  createdAt: string
): Pick<
  Debt,
  | 'interestRateBps'
  | 'interestType'
  | 'interestStartMode'
  | 'interestAccrualFrequency'
  | 'interestStartDate'
  | 'accruedInterestMinor'
  | 'interestPaidMinor'
  | 'principalPaidMinor'
> {
  if (input.interestRateBps == null) {
    return {
      interestPaidMinor: 0,
      principalPaidMinor: 0,
    };
  }

  const interestStartMode = input.interestStartMode ?? DEFAULT_INTEREST_START_MODE;
  const interestStartDate =
    interestStartMode === 'after_due' && input.dueDate
      ? toLocalDateString(input.dueDate)
      : toLocalDateString(createdAt);

  return {
    interestRateBps: input.interestRateBps,
    interestType: input.interestType ?? 'simple',
    interestStartMode,
    interestAccrualFrequency: input.interestAccrualFrequency ?? DEFAULT_INTEREST_ACCRUAL_FREQUENCY,
    interestStartDate,
    accruedInterestMinor: 0,
    interestPaidMinor: 0,
    principalPaidMinor: 0,
  };
}

export function buildRecurringFields(
  input: AddDebtInput,
  recurringGroupId: string,
  recurringSourceId: string
): Pick<
  Debt,
  | 'isRecurring'
  | 'recurrenceInterval'
  | 'recurrenceAnchorDate'
  | 'nextCycleDate'
  | 'lastGeneratedAt'
  | 'recurringGroupId'
  | 'recurringSourceId'
  | 'carryOverBalance'
  | 'instalmentTotal'
  | 'instalmentCount'
  | 'instalmentIndex'
> {
  if (!input.isRecurring || !input.recurrenceInterval || !input.dueDate) {
    return {
      isRecurring: false,
      recurringGroupId,
      recurringSourceId,
    };
  }

  const anchorDate = toLocalDateString(input.dueDate);

  return {
    isRecurring: true,
    recurrenceInterval: input.recurrenceInterval,
    recurrenceAnchorDate: anchorDate,
    nextCycleDate: anchorDate,
    recurringGroupId,
    recurringSourceId,
    carryOverBalance: input.carryOverBalance ?? false,
    instalmentTotal: input.instalmentTotal,
    instalmentCount: input.instalmentCount,
    instalmentIndex: input.instalmentCount != null ? 1 : undefined,
  };
}

export function getRecurrenceLabel(frequency: RecurrenceFrequency): string {
  switch (frequency) {
    case 'weekly':
      return 'Weekly';
    case 'monthly':
      return 'Monthly';
    case 'yearly':
      return 'Yearly';
  }
}

export function getInterestAccrualLabel(frequency: InterestAccrualFrequency): string {
  switch (frequency) {
    case 'monthly':
      return 'Monthly';
    case 'yearly':
      return 'Yearly';
  }
}
