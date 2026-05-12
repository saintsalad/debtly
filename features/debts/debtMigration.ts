import { Debt, DebtPayment } from '@/features/debts/types';
import { toLocalDateString } from '@/features/debts/dates';
import { majorToMinor } from '@/features/debts/money';
import {
  DEFAULT_INTEREST_ACCRUAL_FREQUENCY,
  DEFAULT_INTEREST_START_MODE,
  interestRateToBps,
} from '@/features/debts/interestEngine';

function migratePayment(payment: DebtPayment & { amount?: number }): DebtPayment {
  const amountMinor =
    payment.amountMinor ??
    (payment.amount != null ? majorToMinor(payment.amount) : 0);

  return {
    id: payment.id,
    amountMinor,
    interestAppliedMinor: payment.interestAppliedMinor ?? 0,
    principalAppliedMinor: payment.principalAppliedMinor ?? amountMinor,
    paidAt: payment.paidAt,
    note: payment.note,
  };
}

export function migrateDebtRecord(debt: Debt & { amount?: number; interestRate?: number }): Debt {
  const principalMinor =
    debt.principalMinor ??
    (debt.amount != null ? majorToMinor(debt.amount) : 0);

  const interestRateBps =
    debt.interestRateBps ??
    (debt.interestRate != null ? interestRateToBps(debt.interestRate) : undefined);

  const payments = (debt.payments ?? []).map(migratePayment);
  const interestPaidMinor =
    debt.interestPaidMinor ??
    payments.reduce((sum, payment) => sum + payment.interestAppliedMinor, 0);
  const principalPaidMinor =
    debt.principalPaidMinor ??
    payments.reduce((sum, payment) => sum + payment.principalAppliedMinor, 0);

  const dueDate = debt.dueDate ? toLocalDateString(debt.dueDate) : undefined;
  const recurrenceInterval = debt.recurrenceInterval ?? debt.recurrenceFrequency;
  const recurringGroupId = debt.recurringGroupId ?? debt.id;
  const recurringSourceId = debt.recurringSourceId ?? debt.id;

  return {
    ...debt,
    principalMinor,
    dueDate,
    payments,
    interestRateBps,
    interestStartMode: debt.interestStartMode ?? DEFAULT_INTEREST_START_MODE,
    interestAccrualFrequency:
      debt.interestAccrualFrequency ?? DEFAULT_INTEREST_ACCRUAL_FREQUENCY,
    interestStartDate:
      debt.interestStartDate ??
      (interestRateBps
        ? debt.interestStartMode === 'after_due' && dueDate
          ? dueDate
          : toLocalDateString(debt.createdAt)
        : undefined),
    accruedInterestMinor: debt.accruedInterestMinor,
    interestPaidMinor,
    principalPaidMinor,
    paidAt: debt.paidAt,
    recurrenceInterval,
    recurrenceAnchorDate:
      debt.recurrenceAnchorDate ?? (debt.isRecurring && dueDate ? dueDate : undefined),
    nextCycleDate: debt.nextCycleDate ?? (dueDate ? dueDate : undefined),
    lastGeneratedAt: debt.lastGeneratedAt,
    recurringGroupId,
    recurringSourceId,
    isRecurring: Boolean(debt.isRecurring && recurrenceInterval && dueDate),
  };
}

export function migrateDebts(debts: Array<Debt & { amount?: number; interestRate?: number }>): Debt[] {
  return debts.map(migrateDebtRecord);
}
