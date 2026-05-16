import { minorToMajor } from '@/features/debts/money';
import type { Debt, DebtPayment } from '@/features/debts/types';

export function formatPaymentDateTime(iso: string): string {
  const date = new Date(iso);
  const datePart = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timePart = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${datePart} · ${timePart}`;
}

export function getPaymentAmountMajor(payment: DebtPayment): number {
  return minorToMajor(payment.amountMinor);
}

/** Newest payment first. */
export function getDebtPaymentsNewestFirst(debt: Debt): DebtPayment[] {
  return [...(debt.payments ?? [])].sort(
    (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()
  );
}
