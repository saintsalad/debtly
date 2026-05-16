import { Alert, Linking, Platform, Share } from 'react-native';
import { Debt } from '@/features/debts/types';
import {
  getAccruedInterest,
  getPrincipalAmount,
  getRecurrenceLabel,
  getRemainingBalance,
  getTotalDue,
  getTotalPaid,
} from '@/features/debts/debtCalculations';
import { interestRateFromBps, getInterestAccrualLabel } from '@/features/debts/interestEngine';
import { formatDate, getComputedStatus } from '@/lib/utils';

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

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

export function buildTransactionSummary(debt: Debt, fmt: (amount: number) => string): string {
  const status = getComputedStatus(debt);
  const direction = debt.type === 'owed_to_me' ? 'Owes you' : 'You owe';
  const remaining = getRemainingBalance(debt);
  const totalDue = getTotalDue(debt);
  const totalPaid = getTotalPaid(debt);
  const accruedInterest = getAccruedInterest(debt);
  const principal = getPrincipalAmount(debt);
  const lines = [
    'Debtly transaction',
    '',
    `Person: ${debt.personName}`,
    `Direction: ${direction}`,
    `Principal: ${fmt(principal)}`,
    `Remaining: ${fmt(remaining)}`,
    `Status: ${formatStatus(status)}`,
  ];

  if (debt.interestRateBps) lines.push(`Interest rate: ${interestRateFromBps(debt.interestRateBps)}% APR`);
  if (debt.interestRateBps && debt.interestAccrualFrequency) {
    lines.push(`Interest accrual: ${getInterestAccrualLabel(debt.interestAccrualFrequency)}`);
  }
  if (accruedInterest > 0) lines.push(`Accrued interest: ${fmt(accruedInterest)}`);
  if (totalPaid > 0) lines.push(`Paid to date: ${fmt(totalPaid)}`);
  if (totalDue !== principal) lines.push(`Total due: ${fmt(totalDue)}`);
  if (
    debt.recurrenceInterval &&
    (debt.isRecurring || debt.instalmentCount != null)
  ) {
    const label =
      debt.instalmentCount != null && !debt.isRecurring ? 'Schedule' : 'Recurring';
    lines.push(`${label}: ${getRecurrenceLabel(debt.recurrenceInterval)}`);
  }
  if (debt.note) lines.push(`Note: ${debt.note}`);
  if (debt.dueDate) lines.push(`Due: ${formatDate(debt.dueDate)}`);
  lines.push(`Added: ${formatFullDate(debt.createdAt)}`);
  if (debt.updatedAt !== debt.createdAt) {
    lines.push(`Updated: ${formatFullDate(debt.updatedAt)}`);
  }

  return lines.join('\n');
}

export function buildReminderMessage(debt: Debt, fmt: (amount: number) => string): string {
  const dueLine = debt.dueDate ? ` It was due ${formatDate(debt.dueDate)}.` : '';
  const noteLine = debt.note ? ` For: ${debt.note}.` : '';
  const remaining = getRemainingBalance(debt);
  const signature = '\n\n— Debtly';

  if (debt.type === 'owed_to_me') {
    return `Hi ${debt.personName}, this is a friendly reminder about ${fmt(remaining)} you owe.${noteLine}${dueLine} Thanks!${signature}`;
  }

  return `Reminder: you owe ${debt.personName} ${fmt(remaining)}.${noteLine}${dueLine}${signature}`;
}

async function shareText(title: string, message: string) {
  try {
    await Share.share({ title, message });
  } catch {
    Alert.alert('Unable to share', 'Please try again in a moment.');
  }
}

export async function printTransaction(debt: Debt, fmt: (amount: number) => string) {
  await shareText('Print transaction', buildTransactionSummary(debt, fmt));
}

export async function sendTransactionReminder(debt: Debt, fmt: (amount: number) => string) {
  await shareText('Payment reminder', buildReminderMessage(debt, fmt));
}

export async function openSmsReminder(debt: Debt, fmt: (amount: number) => string) {
  const body = buildReminderMessage(debt, fmt);
  const url = Platform.select({
    ios: `sms:&body=${encodeURIComponent(body)}`,
    default: `sms:?body=${encodeURIComponent(body)}`,
  });

  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert('Messages unavailable', 'Copy the reminder text and send it manually.');
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert('Unable to open Messages', 'Please try again in a moment.');
  }
}
