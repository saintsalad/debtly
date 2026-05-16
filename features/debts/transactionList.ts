import type { Debt } from '@/features/debts/types';

export function isSplitBillDebt(debt: Debt): boolean {
  return debt.sourceType === 'group';
}

/** Debts shown on the Transactions tab (manual entries always; split bills optional). */
export function filterDebtsForTransactionsTab(
  debts: Debt[],
  showSplitBills: boolean
): Debt[] {
  if (showSplitBills) return debts;
  return debts.filter((d) => !isSplitBillDebt(d));
}
