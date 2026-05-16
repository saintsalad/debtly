import type { Debt } from '@/features/debts/types';
import { isDebtActive } from '@/features/debts/debtCalculations';

export function isSplitBillDebt(debt: Debt): boolean {
  return debt.sourceType === 'group';
}

/** Debts shown on the Transactions tab (manual entries always; split bills optional). */
export function filterDebtsForTransactionsTab(
  debts: Debt[],
  showSplitBills: boolean
): Debt[] {
  const visible = showSplitBills ? debts : debts.filter((d) => !isSplitBillDebt(d));
  return visible;
}

/** Returns only debts that are currently active (startDate has passed or not set). */
export function filterActiveDebts(debts: Debt[]): Debt[] {
  return debts.filter((d) => isDebtActive(d));
}

/** Returns debts that are scheduled (startDate is in the future). */
export function filterScheduledDebts(debts: Debt[]): Debt[] {
  return debts.filter((d) => !isDebtActive(d));
}
