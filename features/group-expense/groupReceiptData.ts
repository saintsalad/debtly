import { minorToMajor } from '@/features/debts/money';
import {
  isGroupLedgerBalanced,
  selectEveryMemberNet,
} from '@/features/group-expense/balanceEngine';
import type { GroupExpense, Settlement, SplitGroup } from '@/features/group-expense/types';
import type {
  ReceiptRow,
  ReceiptSection,
  TransactionReceiptData,
} from '@/features/debts/receipt/transactionReceiptData';
import {
  formatReceiptHeaderDate,
  formatReceiptPrintedAt,
  formatReceiptReferenceId,
} from '@/features/debts/receipt/transactionReceiptData';

function fm(fmt: (amount: number) => string, minor: number): string {
  return fmt(minorToMajor(minor));
}

/** MEMBERS column: square or credit position → “Paid”; only debit balances show −amount. */
function formatMemberNetForReceipt(fmt: (amount: number) => string, netMinor: number): string {
  if (netMinor >= 0) return 'Paid';
  return `−${fm(fmt, Math.abs(netMinor))}`;
}

/** Generic split-group receipt: full roster + neutral amounts (same export from group menu or member row). */
export function buildGroupSplitReceiptData(
  group: SplitGroup,
  expenses: GroupExpense[],
  settlements: Settlement[],
  fmt: (amount: number) => string,
  printedAt: Date = new Date()
): TransactionReceiptData {
  const referenceSeed = `group:${group.id}`;
  const groupExpenses = expenses.filter((e) => e.groupId === group.id && !e.deletedAt);
  const expenseCount = groupExpenses.length;
  const totalSpendMinor = groupExpenses.reduce((sum, e) => sum + e.amountMinor, 0);

  const memberNets = selectEveryMemberNet(group, expenses, settlements);
  const sortedMembers = [...memberNets].sort((a, b) =>
    a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' })
  );

  const snapshotRows: ReceiptRow[] = [
    { label: 'Members', value: String(group.members.length) },
    { label: 'Expenses', value: String(expenseCount) },
    { label: 'Total spend', value: fm(fmt, totalSpendMinor) },
    {
      label: 'Ledger',
      value: isGroupLedgerBalanced(group, expenses, settlements)
        ? 'All entries square'
        : 'Running balances below',
    },
  ];

  const memberRows: ReceiptRow[] = sortedMembers.map((m) => ({
    label: m.displayName,
    value: formatMemberNetForReceipt(fmt, m.netMinor),
  }));

  const sections: ReceiptSection[] = [
    { title: 'GROUP', rows: snapshotRows },
    { title: 'MEMBERS', rows: memberRows },
  ];

  return {
    referenceId: formatReceiptReferenceId(referenceSeed),
    printedAt: formatReceiptPrintedAt(printedAt),
    header: {
      title: group.name,
      date: formatReceiptHeaderDate(printedAt),
      amount: fm(fmt, totalSpendMinor),
    },
    rows: [],
    paymentLines: [],
    sections,
  };
}
