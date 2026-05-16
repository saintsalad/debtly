import {
  getAccruedInterest,
  getPrincipalAmount,
  getRecurrenceLabel,
  getRemainingBalance,
  getTotalDue,
  getTotalPaid,
} from '@/features/debts/debtCalculations';
import { getInterestAccrualLabel, interestRateFromBps } from '@/features/debts/interestEngine';
import {
  formatPaymentDateTime,
  getDebtPaymentsNewestFirst,
  getPaymentAmountMajor,
} from '@/features/debts/paymentHistory';
import type { Debt, DebtType } from '@/features/debts/types';
import { formatDate, getComputedStatus } from '@/lib/utils';

export interface ReceiptRow {
  label: string;
  value: string;
}

export interface ReceiptHero {
  title: string;
  subtitle: string;
}

export interface TransactionReceiptData {
  referenceId: string;
  printedAt: string;
  heroDate: string;
  heroLeft: ReceiptHero;
  heroRight: ReceiptHero;
  rows: ReceiptRow[];
  paymentLines: ReceiptRow[];
}

function formatDebtTypeLabel(type: DebtType): string {
  return type === 'owed_to_me' ? 'Owed to me' : 'I owe';
}

export function formatReceiptHeroDate(date: Date): string {
  return date
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    .toUpperCase();
}

const REFERENCE_LENGTH = 20;
const SEGMENT_SIZE = 4;

function formatStatus(status: ReturnType<typeof getComputedStatus>): string {
  switch (status) {
    case 'paid':
      return 'Paid';
    case 'partial':
      return 'Partially paid';
    case 'overdue':
      return 'Overdue';
    default:
      return 'Pending';
  }
}

/** Groups a transaction id into thermal-receipt style segments (e.g. A1B2-C3D4-…). */
export function formatReceiptReferenceId(id: string): string {
  const compact = id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, REFERENCE_LENGTH);
  const segments: string[] = [];
  for (let i = 0; i < compact.length; i += SEGMENT_SIZE) {
    segments.push(compact.slice(i, i + SEGMENT_SIZE));
  }
  return segments.join('-');
}

/** Receipt header timestamp — day, date, and time. */
export function formatReceiptPrintedAt(date: Date = new Date()): string {
  const day = date.toLocaleDateString('en-US', { weekday: 'short' });
  const datePart = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timePart = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
  return `${day}, ${datePart} • ${timePart}`;
}

export function buildReceiptRows(debt: Debt, fmt: (amount: number) => string): ReceiptRow[] {
  const status = getComputedStatus(debt);
  const remaining = getRemainingBalance(debt);
  const totalDue = getTotalDue(debt);
  const totalPaid = getTotalPaid(debt);
  const accruedInterest = getAccruedInterest(debt);
  const principal = getPrincipalAmount(debt);

  const rows: ReceiptRow[] = [
    { label: 'Person', value: debt.personName },
    { label: 'Principal', value: fmt(principal) },
    { label: 'Remaining', value: fmt(remaining) },
    { label: 'Status', value: formatStatus(status) },
  ];

  if (debt.interestRateBps) {
    rows.push({
      label: 'Interest rate',
      value: `${interestRateFromBps(debt.interestRateBps)}% APR`,
    });
  }
  if (debt.interestRateBps && debt.interestAccrualFrequency) {
    rows.push({
      label: 'Interest accrual',
      value: getInterestAccrualLabel(debt.interestAccrualFrequency),
    });
  }
  if (accruedInterest > 0) {
    rows.push({ label: 'Accrued interest', value: fmt(accruedInterest) });
  }
  if (totalPaid > 0) {
    rows.push({ label: 'Paid to date', value: fmt(totalPaid) });
  }
  if (totalDue !== principal) {
    rows.push({ label: 'Total due', value: fmt(totalDue) });
  }
  if (debt.recurrenceInterval && (debt.isRecurring || debt.instalmentCount != null)) {
    const label = debt.instalmentCount != null && !debt.isRecurring ? 'Schedule' : 'Recurring';
    rows.push({
      label,
      value: getRecurrenceLabel(debt.recurrenceInterval),
    });
  }
  if (debt.instalmentCount != null && debt.instalmentIndex != null) {
    rows.push({
      label: 'Payment',
      value: `${debt.instalmentIndex} of ${debt.instalmentCount}`,
    });
  }
  if (debt.note) {
    rows.push({ label: 'Note', value: debt.note });
  }
  if (debt.dueDate) {
    rows.push({ label: 'Due date', value: formatDate(debt.dueDate) });
  }
  if (debt.paidAt) {
    rows.push({ label: 'Paid on', value: formatPaymentDateTime(debt.paidAt) });
  }

  return rows;
}

export function buildReceiptPaymentLines(
  debt: Debt,
  fmt: (amount: number) => string
): ReceiptRow[] {
  const payments = getDebtPaymentsNewestFirst(debt);
  return payments.map((p) => ({
    label: formatPaymentDateTime(p.paidAt).split(' · ')[0] ?? formatPaymentDateTime(p.paidAt),
    value: fmt(getPaymentAmountMajor(p)),
  }));
}

export function buildTransactionReceiptData(
  debt: Debt,
  fmt: (amount: number) => string,
  printedAt: Date = new Date()
): TransactionReceiptData {
  const remaining = getRemainingBalance(debt);
  return {
    referenceId: formatReceiptReferenceId(debt.id),
    printedAt: formatReceiptPrintedAt(printedAt),
    heroDate: formatReceiptHeroDate(printedAt),
    heroLeft: {
      title: debt.personName.toUpperCase(),
      subtitle: formatDebtTypeLabel(debt.type),
    },
    heroRight: {
      title: fmt(remaining),
      subtitle: formatReceiptHeroDate(printedAt),
    },
    rows: buildReceiptRows(debt, fmt),
    paymentLines: buildReceiptPaymentLines(debt, fmt),
  };
}
