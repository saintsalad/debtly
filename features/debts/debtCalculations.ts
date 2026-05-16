import { AddDebtInput, Debt, RecurrenceFrequency } from '@/features/debts/types';
import {
  getAccruedInterestMajor,
  getPaymentProgress,
  getPrincipalMajor,
  getRemainingBalanceMajor,
  getTotalDueMajor,
  getTotalPaidMajor,
} from '@/features/debts/debtLedger';
import {
  buildInterestFields,
  buildRecurringFields,
  getRecurrenceLabel,
  validateAddDebtInput,
} from '@/features/debts/interestEngine';
import { majorToMinor, minorToMajor } from '@/features/debts/money';
import { parseLocalDate, toLocalDateString } from '@/features/debts/dates';
import { generateId } from '@/lib/utils';
import { isBefore, startOfDay } from 'date-fns';

export { getRecurrenceLabel, validateAddDebtInput };

export function getTotalPaid(debt: Debt): number {
  return getTotalPaidMajor(debt);
}

export function getAccruedInterest(debt: Debt, asOf = new Date()): number {
  return getAccruedInterestMajor(debt, asOf);
}

export function getTotalDue(debt: Debt, asOf = new Date()): number {
  return getTotalDueMajor(debt, asOf);
}

export function getRemainingBalance(debt: Debt, asOf = new Date()): number {
  return getRemainingBalanceMajor(debt, asOf);
}

export function isDebtSettled(debt: Debt, asOf = new Date()): boolean {
  return getRemainingBalanceMajor(debt, asOf) <= 0.009;
}

/**
 * Returns false when a debt has a future startDate and that date has not yet been reached.
 * Inactive debts are excluded from balance totals and shown in a "Scheduled" section.
 */
export function isDebtActive(debt: Debt, asOf = new Date()): boolean {
  if (!debt.startDate) return true;
  return !isBefore(startOfDay(asOf), parseLocalDate(debt.startDate));
}

export function getPrincipalAmount(debt: Debt): number {
  return getPrincipalMajor(debt);
}

/** Full settled obligation (principal + interest) for paid-row display. */
export function getSettledDisplayAmount(debt: Debt): number {
  const totalDue = getTotalDue(debt);
  const totalPaid = getTotalPaid(debt);
  if (totalDue > 0.009) return totalDue;
  if (totalPaid > 0.009) return totalPaid;
  return getPrincipalAmount(debt);
}

export { getPaymentProgress };

export function createDebtFromInput(input: AddDebtInput, createdAt: string): Debt {
  const id = generateId();
  const principalMinor = majorToMinor(input.amount);
  const dueDate = input.dueDate ? toLocalDateString(input.dueDate) : undefined;
  const startDate = input.startDate ? toLocalDateString(input.startDate) : undefined;

  return {
    id,
    personName: input.personName.trim(),
    principalMinor,
    type: input.type,
    note: input.note?.trim() || undefined,
    dueDate,
    startDate,
    status: 'pending',
    payments: [],
    createdAt,
    updatedAt: createdAt,
    ...buildInterestFields(input, createdAt),
    ...buildRecurringFields(input, id, id),
  };
}

export function getDebtAmountMajor(debt: Debt): number {
  return minorToMajor(debt.principalMinor);
}

export type { RecurrenceFrequency };
