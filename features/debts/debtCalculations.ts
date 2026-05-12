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
import { toLocalDateString } from '@/features/debts/dates';
import { generateId } from '@/lib/utils';

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

export function getPrincipalAmount(debt: Debt): number {
  return getPrincipalMajor(debt);
}

export { getPaymentProgress };

export function createDebtFromInput(input: AddDebtInput, createdAt: string): Debt {
  const id = generateId();
  const principalMinor = majorToMinor(input.amount);
  const dueDate = input.dueDate ? toLocalDateString(input.dueDate) : undefined;

  return {
    id,
    personName: input.personName.trim(),
    principalMinor,
    type: input.type,
    note: input.note?.trim() || undefined,
    dueDate,
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
