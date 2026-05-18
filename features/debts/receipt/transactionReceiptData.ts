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

export interface ReceiptHeader {
  title: string;
  date: string;
  amount: string;
}

/** Section labels + rows — used for split-group slips with clearer grouping. */
export interface ReceiptSection {
  title: string;
  rows: ReceiptRow[];
}

export interface TransactionReceiptData {
  referenceId: string;
  printedAt: string;
  header: ReceiptHeader;
  rows: ReceiptRow[];
  paymentLines: ReceiptRow[];
  /** When non-empty, replaces flat `rows` with titled sections (e.g. split groups). */
  sections?: ReceiptSection[];
}

export interface BuildReceiptRowsOptions {
  omitPerson?: boolean;
  omitRemaining?: boolean;
}

/** Receipt header date — title case (e.g. May 17, 2026). */
export function formatReceiptHeaderDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatPossessiveDebtTitle(personName: string): string {
  const name = personName.trim();
  if (!name) return 'Debt';
  const possessive = /s$/i.test(name) ? `${name}'` : `${name}'s`;
  return `${possessive} Debt`;
}

export function formatReceiptHeaderTitle(type: DebtType, personName: string): string {
  if (type === 'i_owe') return 'My Debt';
  return formatPossessiveDebtTitle(personName);
}

const REFERENCE_SUFFIX_LENGTH = 8;

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

/** Debtly receipt reference (e.g. DBTLY-34567890). */
export function formatReceiptReferenceId(id: string): string {
  const compact = id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const suffix = compact.slice(-REFERENCE_SUFFIX_LENGTH).padStart(REFERENCE_SUFFIX_LENGTH, '0');
  return `DBTLY-${suffix}`;
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

export function buildReceiptRows(
  debt: Debt,
  fmt: (amount: number) => string,
  options: BuildReceiptRowsOptions = {}
): ReceiptRow[] {
  const status = getComputedStatus(debt);
  const remaining = getRemainingBalance(debt);
  const totalDue = getTotalDue(debt);
  const totalPaid = getTotalPaid(debt);
  const accruedInterest = getAccruedInterest(debt);
  const principal = getPrincipalAmount(debt);

  const rows: ReceiptRow[] = [];
  if (!options.omitPerson) {
    rows.push({ label: 'Person', value: debt.personName });
  }
  rows.push({ label: 'Principal', value: fmt(principal) });
  if (!options.omitRemaining) {
    rows.push({ label: 'Remaining', value: fmt(remaining) });
  }
  rows.push({ label: 'Status', value: formatStatus(status) });

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
  if (debt.dueDate) {
    rows.push({ label: 'Due date', value: formatDate(debt.dueDate) });
  }
  if (debt.paidAt) {
    rows.push({ label: 'Paid on', value: formatPaymentDateTime(debt.paidAt) });
  }
  if (debt.note) {
    rows.push({ label: 'Note', value: debt.note });
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
  const rowOptions: BuildReceiptRowsOptions = { omitPerson: true, omitRemaining: true };

  return {
    referenceId: formatReceiptReferenceId(debt.id),
    printedAt: formatReceiptPrintedAt(printedAt),
    header: {
      title: formatReceiptHeaderTitle(debt.type, debt.personName),
      date: formatReceiptHeaderDate(printedAt),
      amount: fmt(remaining),
    },
    rows: buildReceiptRows(debt, fmt, rowOptions),
    paymentLines: buildReceiptPaymentLines(debt, fmt),
  };
}
