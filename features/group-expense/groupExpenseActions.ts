import { Alert, Linking, Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { minorToMajor } from '@/features/debts/money';
import { selectGroupBalances } from '@/features/group-expense/balanceEngine';
import { formatBalanceLine } from '@/features/group-expense/groupDebtSync';
import type { GroupExpense, Settlement, SplitGroup } from '@/features/group-expense/types';

export function buildGroupSummaryText(
  group: SplitGroup,
  expenses: GroupExpense[],
  settlements: Settlement[],
  fmt: (amount: number) => string,
  currencySymbol: string
): string {
  const summary = selectGroupBalances(group, expenses, settlements);
  const lines = [
    `Debtly — ${group.name}`,
    '',
    `Total group spending: ${fmt(minorToMajor(summary.totalSpendMinor))}`,
    `You owe: ${fmt(minorToMajor(summary.youOweMinor))}`,
    `You are owed: ${fmt(minorToMajor(summary.youAreOwedMinor))}`,
    '',
    'Balances:',
  ];

  for (const pair of summary.pairwise) {
    if (pair.netMinor === 0) continue;
    lines.push(`• ${formatBalanceLine(pair.displayName, pair.netMinor, currencySymbol)}`);
  }

  const recent = expenses
    .filter((e) => e.groupId === group.id && !e.deletedAt)
    .slice(0, 5);

  if (recent.length > 0) {
    lines.push('', 'Recent expenses:');
    for (const e of recent) {
      lines.push(`• ${e.title} — ${fmt(minorToMajor(e.amountMinor))}`);
    }
  }

  return lines.join('\n');
}

export async function shareGroupSummary(
  group: SplitGroup,
  expenses: GroupExpense[],
  settlements: Settlement[],
  fmt: (amount: number) => string,
  currencySymbol: string
) {
  const message = buildGroupSummaryText(group, expenses, settlements, fmt, currencySymbol);
  try {
    await Share.share({ message, title: group.name });
  } catch {
    Alert.alert('Could not share', 'Try again in a moment.');
  }
}

export function recentGroupExpenseTitles(
  groupId: string,
  expenses: GroupExpense[],
  limit: number
): string[] {
  return [...expenses]
    .filter((e) => e.groupId === groupId && !e.deletedAt)
    .sort((a, b) => {
      const byDate = b.expenseDate.localeCompare(a.expenseDate);
      if (byDate !== 0) return byDate;
      return b.createdAt.localeCompare(a.createdAt);
    })
    .slice(0, limit)
    .map((e) => e.title.trim())
    .filter((t) => t.length > 0);
}

function pickRandomIndex(length: number): number {
  return Math.floor(Math.random() * length);
}

type SmsParts = {
  memberName: string;
  groupName: string;
  amount: string;
  expensesBit: string;
};

/** SMS: shorter Taglish / Gen Z — still clearly from Debtly app + expenses hint. */
const SMS_MESSAGE_TEMPLATES: ((p: SmsParts) => string)[] = [
  (p) =>
    `uy ${p.memberName} — Debtly app for "${p.groupName}": ${p.amount}.${p.expensesBit} skl automated mula sa Debtly app, hindi si crush na left on seen (charot… unless?)`,
  (p) =>
    `Hi lods ${p.memberName}, Debtly app dito. "${p.groupName}" balance: ${p.amount}.${p.expensesBit} Para 'di na kailangan mag-hagip ng "paki-settle na" sa barkada GC fr fr`,
  (p) =>
    `sheesh ${p.memberName}, "${p.groupName}" ledger sa Debtly app says ${p.amount}.${p.expensesBit} Debtly app ang nagsabi ha, wag ako idamay sa bardagulan`,
];

function buildOwedBalanceSmsBody(
  memberName: string,
  amountMinor: number,
  groupName: string,
  fmt: (amount: number) => string,
  expenseTitles: string[]
): string {
  const amount = fmt(minorToMajor(amountMinor));
  const topTitles = expenseTitles.slice(0, 3);
  const expensesBit =
    topTitles.length > 0
      ? ` Recent budol (Debtly app): ${topTitles.join(', ')}.`
      : " Pulls from Debtly app logs.";

  const parts: SmsParts = { memberName, groupName, amount, expensesBit };
  return SMS_MESSAGE_TEMPLATES[pickRandomIndex(SMS_MESSAGE_TEMPLATES.length)](parts);
}

/** SMS composer: random humorous Debtly-voiced template + expenses. */
export function openOwedBalanceSms(
  memberName: string,
  amountMinor: number,
  groupName: string,
  fmt: (amount: number) => string,
  expenseTitles: string[]
) {
  const body = encodeURIComponent(
    buildOwedBalanceSmsBody(memberName, amountMinor, groupName, fmt, expenseTitles)
  );

  if (Platform.OS === 'ios') {
    void Linking.openURL(`sms:&body=${body}`);
  } else {
    void Linking.openURL(`sms:?body=${body}`);
  }
}

export async function copyStringToClipboard(text: string): Promise<boolean> {
  try {
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    return false;
  }
}

/** Opens the system share sheet with the join URL/message. */
export async function shareInviteLinkMessage(link: string): Promise<void> {
  try {
    // Android: including `title` often surfaces as extra text in previews / choosers vs iOS.
    if (Platform.OS === 'android') {
      await Share.share({ message: link });
    } else {
      await Share.share({ message: link, title: 'Join my Debtly group' });
    }
  } catch {
    Alert.alert('Could not share link', 'Try again in a moment.');
  }
}

/** @deprecated Misnamed — use {@link shareInviteLinkMessage}. */
export async function copyInviteLink(link: string): Promise<void> {
  return shareInviteLinkMessage(link);
}
