import { Alert, Linking, Platform, Share } from 'react-native';
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

export function sendGroupReminder(
  memberName: string,
  amountMinor: number,
  groupName: string,
  fmt: (amount: number) => string
) {
  const amount = fmt(minorToMajor(amountMinor));
  const body = encodeURIComponent(
    `Hi ${memberName}, friendly reminder about our "${groupName}" group on Debtly. Your balance: ${amount}.`
  );

  if (Platform.OS === 'ios') {
    void Linking.openURL(`sms:&body=${body}`);
  } else {
    void Linking.openURL(`sms:?body=${body}`);
  }
}

export async function copyInviteLink(link: string) {
  try {
    await Share.share({ message: link, title: 'Join my Debtly group' });
  } catch {
    Alert.alert('Could not share link', 'Try again in a moment.');
  }
}
