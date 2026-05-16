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
import { advanceRecurringDueDate, parseLocalDate, toLocalDateString } from '@/features/debts/dates';
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

/**
 * One instalment row per scheduled payment: same principal each cycle, spaced by recurrence.
 * Entries are independent (no recurring spawn-on-settle).
 */
export function createInstalmentPlanDebts(input: AddDebtInput, createdAt: string): Debt[] {
  const count = input.instalmentCount;
  const interval = input.recurrenceInterval;
  if (
    count == null ||
    count < 2 ||
    !interval ||
    !input.dueDate ||
    !input.isRecurring
  ) {
    throw new Error('createInstalmentPlanDebts: invalid input');
  }

  const principalMinor = majorToMinor(input.amount);
  const instalmentTotalMinor = principalMinor * count;
  const groupId = generateId();
  const startDateStr = input.startDate ? toLocalDateString(input.startDate) : undefined;

  let currentDueLocal = toLocalDateString(input.dueDate);
  const anchor = currentDueLocal;
  const debts: Debt[] = [];

  for (let instalmentIndex = 1; instalmentIndex <= count; instalmentIndex += 1) {
    const id = generateId();
    const dueISO = `${currentDueLocal}T12:00:00.000Z`;
    const sliceInput: AddDebtInput = {
      ...input,
      dueDate: dueISO,
      isRecurring: false,
      instalmentTotal: instalmentTotalMinor,
    };

    const dueDateStored = currentDueLocal;

    debts.push({
      id,
      personName: input.personName.trim(),
      principalMinor,
      type: input.type,
      note: input.note?.trim() || undefined,
      dueDate: dueDateStored,
      startDate: startDateStr,
      status: 'pending',
      payments: [],
      createdAt,
      updatedAt: createdAt,
      ...buildInterestFields(sliceInput, createdAt),
      isRecurring: false,
      recurrenceInterval: interval,
      instalmentTotal: instalmentTotalMinor,
      instalmentCount: count,
      instalmentIndex,
      recurringGroupId: groupId,
      recurringSourceId: groupId,
    });

    if (instalmentIndex < count) {
      currentDueLocal = advanceRecurringDueDate(anchor, currentDueLocal, interval);
    }
  }

  return debts;
}

export function getDebtAmountMajor(debt: Debt): number {
  return minorToMajor(debt.principalMinor);
}

export type { RecurrenceFrequency };
