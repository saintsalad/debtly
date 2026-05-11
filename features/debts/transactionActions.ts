import { Alert, Linking, Platform, Share } from 'react-native';
import { Debt } from '@/features/debts/types';
import { formatDate, getComputedStatus } from '@/lib/utils';

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function buildTransactionSummary(debt: Debt, fmt: (amount: number) => string): string {
  const status = getComputedStatus(debt);
  const direction = debt.type === 'owed_to_me' ? 'Owes you' : 'You owe';
  const lines = [
    'Debtly transaction',
    '',
    `Person: ${debt.personName}`,
    `Direction: ${direction}`,
    `Amount: ${fmt(debt.amount)}`,
    `Status: ${status === 'paid' ? 'Paid' : status === 'overdue' ? 'Overdue' : 'Pending'}`,
  ];

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

  if (debt.type === 'owed_to_me') {
    return `Hi ${debt.personName}, this is a friendly reminder about ${fmt(debt.amount)} you owe.${noteLine}${dueLine} Thanks!`;
  }

  return `Reminder: you owe ${debt.personName} ${fmt(debt.amount)}.${noteLine}${dueLine}`;
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
