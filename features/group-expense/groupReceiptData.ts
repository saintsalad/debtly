import { minorToMajor } from '@/features/debts/money';
import {
  computeExpenseShares,
  getDirectedOutstandingMinor,
  isGroupLedgerBalanced,
} from '@/features/group-expense/balanceEngine';
import type { GroupExpense, GroupMember, Settlement, SplitGroup } from '@/features/group-expense/types';
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

const INDENT = '  ';

function fm(fmt: (amount: number) => string, minor: number): string {
  return fmt(minorToMajor(minor));
}

function expenseSortKey(e: GroupExpense): string {
  return `${e.expenseDate}\x00${e.createdAt}`;
}

function expenseTitle(expense: GroupExpense): string {
  return (expense.title || 'Expense').trim() || 'Expense';
}

/** Persisted names can be `'You'`; share slip uses profile name like the rest of the app when provided. */
function receiptMemberDisplayName(
  member: GroupMember,
  viewerDisplayName?: string | null
): string {
  if (member.isCurrentUser && viewerDisplayName?.trim()) {
    return viewerDisplayName.trim();
  }
  const n = member.displayName?.trim();
  return n || '?';
}

/** Canonical “who split this bill?” — payer + participant set — for merging receipts. */
function receiptMergeBucketKey(expense: GroupExpense): string {
  const payer = expense.paidByMemberId;
  const includedSorted = [...new Set(expense.includedMemberIds)].sort();
  return `${payer}\x00${includedSorted.join('\x01')}`;
}

function sumExpenseSharesAcross(expenses: GroupExpense[]): Map<string, number> {
  const acc = new Map<string, number>();
  for (const e of expenses) {
    let row: Map<string, number>;
    try {
      row = computeExpenseShares(e);
    } catch {
      row = new Map();
    }
    for (const [memberId, minor] of row) {
      acc.set(memberId, (acc.get(memberId) ?? 0) + minor);
    }
  }
  return acc;
}

/**
 * Integer minor amounts that sum exactly to cappedTarget; weights[i]=0 ⇒ 0.
 * Largest-remainder allocates `allocateTotalMinor` (capped to sum(weights)) proportionally by weights.
 */
function allocateMinorAcrossWeightedBuckets(
  weights: readonly number[],
  allocateTotalMinor: number
): number[] {
  if (weights.length === 0) return [];
  const sumW = weights.reduce((s, w) => s + w, 0);
  if (sumW <= 0) return weights.map(() => 0);

  const cappedTarget = Math.max(0, Math.min(allocateTotalMinor, sumW));

  const floors = weights.map((w) => Math.floor((cappedTarget * w) / sumW));
  let leftover = cappedTarget - floors.reduce((a, b) => a + b, 0);

  /** Descending fractional remainder cappedTarget*w − sumW*floor[w]. */
  const order = [...weights.keys()].sort(
    (a, b) =>
      cappedTarget * weights[b]! -
      sumW * floors[b]! -
      (cappedTarget * weights[a]! - sumW * floors[a]!)
  );

  const out = [...floors];
  for (let k = 0; leftover > 0 && k < order.length; k++) {
    const ix = order[k]!;
    if (weights[ix]! <= 0) continue;
    out[ix] += 1;
    leftover -= 1;
  }

  return out;
}

/**
 * Maps bucket index → each debtor's outstanding minor still owed toward that receipt block's payer
 * (settlements subtracted proportionally across blocks that share payer + debtor edge).
 */
function buildDebtorRemainingMinorByBucket(
  groupId: string,
  groupMembers: readonly GroupMember[],
  groupExpenses: GroupExpense[],
  settlements: Settlement[],
  buckets: GroupExpense[][],
  summedSharesByBucket: ReadonlyArray<Map<string, number>>
): Map<number, Map<string, number>> {
  const byBucketIx = new Map<number, Map<string, number>>();
  for (let i = 0; i < buckets.length; i++) {
    byBucketIx.set(i, new Map<string, number>());
  }

  const payerToBucketIndices = new Map<string, number[]>();
  for (let bi = 0; bi < buckets.length; bi++) {
    const payerId = buckets[bi]![0]!.paidByMemberId;
    const list = payerToBucketIndices.get(payerId) ?? [];
    list.push(bi);
    payerToBucketIndices.set(payerId, list);
  }

  for (const [payerId, ixList] of payerToBucketIndices) {
    for (const debtor of groupMembers) {
      const rawWeights = ixList.map((ix) => summedSharesByBucket[ix]?.get(debtor.id) ?? 0);
      const sumW = rawWeights.reduce((s, r) => s + r, 0);
      if (sumW <= 0) continue;

      if (debtor.id === payerId) continue;

      const directed = getDirectedOutstandingMinor(
        groupExpenses,
        settlements,
        groupId,
        debtor.id,
        payerId
      );

      const allocated = allocateMinorAcrossWeightedBuckets(rawWeights, directed);
      ixList.forEach((bucketIx, pos) => {
        byBucketIx.get(bucketIx)!.set(debtor.id, allocated[pos] ?? 0);
      });
    }
  }

  return byBucketIx;
}

/** One or more bill lines (each on its own row), then Members + share totals. */
function appendReceiptExpenseBlock(params: {
  out: ReceiptRow[];
  billRows: ReceiptRow[];
  payerId: string;
  /** Everyone on the merged split bill(s). Excluded recipients use this Set. */
  includedMemberIds: string[];
  sharesByMember: Map<string, number>;
  /** Outstanding toward this payer per debtor (settlements folded in); may omit untouched debtors */
  debtorRemainingMinor: Map<string, number>;
  fmt: (amount: number) => string;
  people: GroupMember[];
  viewerDisplayName?: string | null;
}): void {
  const {
    out,
    billRows,
    payerId,
    includedMemberIds,
    sharesByMember,
    debtorRemainingMinor,
    fmt,
    people,
    viewerDisplayName,
  } = params;

  const included = new Set(includedMemberIds);

  for (const row of billRows) {
    out.push(row);
  }

  out.push({
    label: 'Members',
    value: '',
  });

  for (const person of people) {
    let value: string;
    const isPayer = person.id === payerId;

    const name = receiptMemberDisplayName(person, viewerDisplayName);
    const nameLabel = `${INDENT}${name}${isPayer ? ' \u2605' : ''}`;

    if (isPayer) {
      value = 'Paid';
    } else if (!included.has(person.id)) {
      value = 'Excluded';
    } else {
      const rawMinor = sharesByMember.get(person.id) ?? 0;
      if (rawMinor <= 0) {
        value = '—';
      } else {
        const remainingMinor = debtorRemainingMinor.get(person.id) ?? rawMinor;
        value = remainingMinor <= 0 ? 'Paid' : fm(fmt, remainingMinor);
      }
    }

    out.push({
      label: nameLabel,
      value,
    });
  }
}

function buildExpenseFirstReceiptRows(params: {
  group: SplitGroup;
  expenses: GroupExpense[];
  settlements: Settlement[];
  fmt: (amount: number) => string;
  viewerDisplayName?: string | null;
}): ReceiptRow[] {
  const { group, expenses, settlements, fmt, viewerDisplayName } = params;
  const sorted = [...expenses].sort((a, b) => expenseSortKey(b).localeCompare(expenseSortKey(a)));
  const people = [...group.members].sort((a, b) =>
    a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' })
  );

  /** Same payer + identical participant lists → combine into one summed block (order = first seen when scanning newest-first). */
  const buckets: GroupExpense[][] = [];
  const bucketIndexByKey = new Map<string, number>();

  for (const e of sorted) {
    const k = receiptMergeBucketKey(e);
    let ix = bucketIndexByKey.get(k);
    if (ix === undefined) {
      ix = buckets.length;
      bucketIndexByKey.set(k, ix);
      buckets.push([]);
    }
    buckets[ix]?.push(e);
  }

  const out: ReceiptRow[] = [];

  const summedSharesList = buckets.map((b) => sumExpenseSharesAcross(b));
  const debtorRemainingByBucket = buildDebtorRemainingMinorByBucket(
    group.id,
    group.members,
    expenses,
    settlements,
    buckets,
    summedSharesList
  );

  for (let bi = 0; bi < buckets.length; bi++) {
    const bucket = buckets[bi]!;
    const head = bucket[0]!;

    const billRows: ReceiptRow[] =
      bucket.length === 1
        ? [{ label: expenseTitle(head), value: fm(fmt, head.amountMinor) }]
        : bucket.map((e) => ({
            label: expenseTitle(e),
            value: fm(fmt, e.amountMinor),
          }));

    const summedShares = summedSharesList[bi]!;

    appendReceiptExpenseBlock({
      out,
      billRows,
      payerId: head.paidByMemberId,
      includedMemberIds: head.includedMemberIds,
      sharesByMember: summedShares,
      debtorRemainingMinor: debtorRemainingByBucket.get(bi)!,
      fmt,
      people,
      viewerDisplayName,
    });

    if (bi < buckets.length - 1) {
      out.push({ label: '', value: '' });
    }
  }

  return out;
}

export function buildGroupSplitReceiptData(
  group: SplitGroup,
  expenses: GroupExpense[],
  settlements: Settlement[],
  fmt: (amount: number) => string,
  printedAt: Date = new Date(),
  viewerDisplayName?: string | null
): TransactionReceiptData {
  const referenceSeed = `group:${group.id}`;

  const groupExpenses = expenses.filter((e) => e.groupId === group.id && !e.deletedAt);
  const expenseCount = groupExpenses.length;
  const totalSpendMinor = groupExpenses.reduce((sum, e) => sum + e.amountMinor, 0);

  const ledgerSquare = isGroupLedgerBalanced(group, expenses, settlements);

  const snapshotRows: ReceiptRow[] = [
    { label: 'Members', value: String(group.members.length) },
    { label: 'Bills', value: String(expenseCount) },
    { label: 'Total spend', value: fm(fmt, totalSpendMinor) },
  ];

  const expenseRows =
    expenseCount > 0
      ? buildExpenseFirstReceiptRows({
          group,
          expenses: groupExpenses,
          settlements,
          fmt,
          viewerDisplayName,
        })
      : [{ label: '(No expenses yet)', value: '—' }];

  const sections: ReceiptSection[] = [
    { title: 'SUMMARY', rows: snapshotRows },
    { title: 'EXPENSES', rows: expenseRows },
  ];

  return {
    referenceId: formatReceiptReferenceId(referenceSeed),
    printedAt: formatReceiptPrintedAt(printedAt),
    header: {
      title: group.name,
      date: formatReceiptHeaderDate(printedAt),
      amount: fm(fmt, ledgerSquare ? 0 : totalSpendMinor),
    },
    rows: [],
    paymentLines: [],
    sections,
    omitFooterAmountRow: true,
  };
}
