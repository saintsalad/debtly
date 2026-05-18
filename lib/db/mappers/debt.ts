import type { Debt, DebtPayment } from '@/features/debts/types';
import type { debtPayments, debts } from '@/lib/db/schema';

export type DebtRow = typeof debts.$inferSelect;
export type DebtPaymentRow = typeof debtPayments.$inferSelect;

export function debtToRow(debt: Debt): DebtRow {
  return {
    id: debt.id,
    personName: debt.personName,
    principalMinor: debt.principalMinor,
    type: debt.type,
    sourceType: debt.sourceType ?? null,
    sourceGroupId: debt.sourceGroupId ?? null,
    sourceMemberId: debt.sourceMemberId ?? null,
    splitGroupId: debt.splitGroupId ?? null,
    note: debt.note ?? null,
    dueDate: debt.dueDate ?? null,
    startDate: debt.startDate ?? null,
    status: debt.status,
    interestRateBps: debt.interestRateBps ?? null,
    interestType: debt.interestType ?? null,
    interestStartMode: debt.interestStartMode ?? null,
    interestAccrualFrequency: debt.interestAccrualFrequency ?? null,
    interestStartDate: debt.interestStartDate ?? null,
    accruedInterestMinor: debt.accruedInterestMinor ?? null,
    interestPaidMinor: debt.interestPaidMinor ?? null,
    principalPaidMinor: debt.principalPaidMinor ?? null,
    paidAt: debt.paidAt ?? null,
    isRecurring: debt.isRecurring ?? null,
    recurrenceInterval: debt.recurrenceInterval ?? null,
    recurrenceAnchorDate: debt.recurrenceAnchorDate ?? null,
    nextCycleDate: debt.nextCycleDate ?? null,
    lastGeneratedAt: debt.lastGeneratedAt ?? null,
    recurringGroupId: debt.recurringGroupId ?? null,
    recurringSourceId: debt.recurringSourceId ?? null,
    carryOverBalance: debt.carryOverBalance ?? null,
    carryOverMinor: debt.carryOverMinor ?? null,
    instalmentTotal: debt.instalmentTotal ?? null,
    instalmentCount: debt.instalmentCount ?? null,
    instalmentIndex: debt.instalmentIndex ?? null,
    currency: debt.currency ?? null,
    originalAmountMinor: debt.originalAmountMinor ?? null,
    conversionRate:
      debt.conversionRate != null ? String(debt.conversionRate) : null,
    recurrenceFrequency: debt.recurrenceFrequency ?? null,
    createdAt: debt.createdAt,
    updatedAt: debt.updatedAt,
  };
}

export function paymentToRow(payment: DebtPayment, debtId: string): DebtPaymentRow {
  return {
    id: payment.id,
    debtId,
    amountMinor: payment.amountMinor,
    interestAppliedMinor: payment.interestAppliedMinor,
    principalAppliedMinor: payment.principalAppliedMinor,
    paidAt: payment.paidAt,
    note: payment.note ?? null,
  };
}

export function rowToDebt(row: DebtRow, payments: DebtPayment[]): Debt {
  return {
    id: row.id,
    personName: row.personName,
    principalMinor: row.principalMinor,
    type: row.type as Debt['type'],
    sourceType: (row.sourceType as Debt['sourceType']) ?? undefined,
    sourceGroupId: row.sourceGroupId ?? undefined,
    sourceMemberId: row.sourceMemberId ?? undefined,
    splitGroupId: row.splitGroupId ?? undefined,
    note: row.note ?? undefined,
    dueDate: row.dueDate ?? undefined,
    startDate: row.startDate ?? undefined,
    status: row.status as Debt['status'],
    interestRateBps: row.interestRateBps ?? undefined,
    interestType: (row.interestType as Debt['interestType']) ?? undefined,
    interestStartMode: (row.interestStartMode as Debt['interestStartMode']) ?? undefined,
    interestAccrualFrequency:
      (row.interestAccrualFrequency as Debt['interestAccrualFrequency']) ?? undefined,
    interestStartDate: row.interestStartDate ?? undefined,
    accruedInterestMinor: row.accruedInterestMinor ?? undefined,
    interestPaidMinor: row.interestPaidMinor ?? undefined,
    principalPaidMinor: row.principalPaidMinor ?? undefined,
    paidAt: row.paidAt ?? undefined,
    isRecurring: row.isRecurring ?? undefined,
    recurrenceInterval:
      (row.recurrenceInterval as Debt['recurrenceInterval']) ?? undefined,
    recurrenceAnchorDate: row.recurrenceAnchorDate ?? undefined,
    nextCycleDate: row.nextCycleDate ?? undefined,
    lastGeneratedAt: row.lastGeneratedAt ?? undefined,
    recurringGroupId: row.recurringGroupId ?? undefined,
    recurringSourceId: row.recurringSourceId ?? undefined,
    carryOverBalance: row.carryOverBalance ?? undefined,
    carryOverMinor: row.carryOverMinor ?? undefined,
    instalmentTotal: row.instalmentTotal ?? undefined,
    instalmentCount: row.instalmentCount ?? undefined,
    instalmentIndex: row.instalmentIndex ?? undefined,
    currency: row.currency ?? undefined,
    originalAmountMinor: row.originalAmountMinor ?? undefined,
    conversionRate:
      row.conversionRate != null ? Number(row.conversionRate) : undefined,
    recurrenceFrequency:
      (row.recurrenceFrequency as Debt['recurrenceFrequency']) ?? undefined,
    payments: payments.length > 0 ? payments : undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function rowToPayment(row: DebtPaymentRow): DebtPayment {
  return {
    id: row.id,
    amountMinor: row.amountMinor,
    interestAppliedMinor: row.interestAppliedMinor,
    principalAppliedMinor: row.principalAppliedMinor,
    paidAt: row.paidAt,
    note: row.note ?? undefined,
  };
}

export function assembleDebts(
  debtRows: DebtRow[],
  paymentRows: DebtPaymentRow[]
): Debt[] {
  const paymentsByDebt = new Map<string, DebtPayment[]>();
  for (const p of paymentRows) {
    const list = paymentsByDebt.get(p.debtId) ?? [];
    list.push(rowToPayment(p));
    paymentsByDebt.set(p.debtId, list);
  }
  return debtRows.map((row) => rowToDebt(row, paymentsByDebt.get(row.id) ?? []));
}
