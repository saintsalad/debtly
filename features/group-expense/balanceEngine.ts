import { majorToMinor } from '@/features/debts/money';
import type {
  GroupBalanceSummary,
  GroupExpense,
  GroupMember,
  PairwiseBalance,
  Settlement,
  SplitGroup,
  SplitMethod,
} from '@/features/group-expense/types';

/** Directed edge: fromMember owes toMember this amount (minor units) */
type EdgeMap = Map<string, number>;

function edgeKey(from: string, to: string): string {
  return `${from}→${to}`;
}

function addEdge(edges: EdgeMap, from: string, to: string, amountMinor: number) {
  if (amountMinor <= 0 || from === to) return;
  const key = edgeKey(from, to);
  edges.set(key, (edges.get(key) ?? 0) + amountMinor);
}

function subtractEdge(edges: EdgeMap, from: string, to: string, amountMinor: number) {
  if (amountMinor <= 0 || from === to) return;
  const key = edgeKey(from, to);
  const next = (edges.get(key) ?? 0) - amountMinor;
  if (next <= 0) edges.delete(key);
  else edges.set(key, next);
}

/** Largest-remainder allocation for equal split */
export function allocateEqualShares(
  amountMinor: number,
  memberIds: string[]
): Map<string, number> {
  const result = new Map<string, number>();
  if (memberIds.length === 0) return result;
  const base = Math.floor(amountMinor / memberIds.length);
  let remainder = amountMinor - base * memberIds.length;
  for (const id of memberIds) {
    let share = base;
    if (remainder > 0) {
      share += 1;
      remainder -= 1;
    }
    result.set(id, share);
  }
  return result;
}

/** Percentage split with remainder on last included member */
export function allocatePercentShares(
  amountMinor: number,
  shares: Array<{ memberId: string; percentBps: number }>
): Map<string, number> {
  const result = new Map<string, number>();
  if (shares.length === 0) return result;
  let allocated = 0;
  for (let i = 0; i < shares.length; i++) {
    const { memberId, percentBps } = shares[i];
    const isLast = i === shares.length - 1;
    const share = isLast
      ? amountMinor - allocated
      : Math.round((amountMinor * percentBps) / 10_000);
    result.set(memberId, share);
    allocated += share;
  }
  return result;
}

export function computeExpenseShares(expense: GroupExpense): Map<string, number> {
  const included = expense.includedMemberIds;
  if (included.length === 0) return new Map();

  switch (expense.splitMethod) {
    case 'equal':
      return allocateEqualShares(expense.amountMinor, included);
    case 'exact': {
      const result = new Map<string, number>();
      for (const share of expense.shares) {
        if (included.includes(share.memberId) && share.valueMinor != null) {
          result.set(share.memberId, share.valueMinor);
        }
      }
      return result;
    }
    case 'percentage': {
      const percentShares = expense.shares
        .filter((s) => included.includes(s.memberId) && s.percentBps != null)
        .map((s) => ({ memberId: s.memberId, percentBps: s.percentBps! }));
      return allocatePercentShares(expense.amountMinor, percentShares);
    }
    default:
      return allocateEqualShares(expense.amountMinor, included);
  }
}

function applyExpenseToEdges(edges: EdgeMap, expense: GroupExpense) {
  const shares = computeExpenseShares(expense);
  const payerId = expense.paidByMemberId;

  for (const [memberId, shareMinor] of shares) {
    if (memberId === payerId) continue;
    addEdge(edges, memberId, payerId, shareMinor);
  }
}

function applySettlementToEdges(edges: EdgeMap, settlement: Settlement) {
  subtractEdge(edges, settlement.fromMemberId, settlement.toMemberId, settlement.amountMinor);
}

export function buildGroupEdges(
  expenses: GroupExpense[],
  settlements: Settlement[],
  groupId: string
): EdgeMap {
  const edges: EdgeMap = new Map();
  for (const expense of expenses) {
    if (expense.groupId !== groupId || expense.deletedAt) continue;
    applyExpenseToEdges(edges, expense);
  }
  for (const settlement of settlements) {
    if (settlement.groupId !== groupId) continue;
    applySettlementToEdges(edges, settlement);
  }
  return edges;
}

/** Net from member A's perspective toward B: positive means B owes A */
export function netBetween(edges: EdgeMap, memberA: string, memberB: string): number {
  const aOwesB = edges.get(edgeKey(memberA, memberB)) ?? 0;
  const bOwesA = edges.get(edgeKey(memberB, memberA)) ?? 0;
  return bOwesA - aOwesB;
}

export function selectGroupBalances(
  group: SplitGroup,
  expenses: GroupExpense[],
  settlements: Settlement[]
): GroupBalanceSummary {
  const groupExpenses = expenses.filter((e) => e.groupId === group.id && !e.deletedAt);
  const groupSettlements = settlements.filter((s) => s.groupId === group.id);
  const edges = buildGroupEdges(groupExpenses, groupSettlements, group.id);

  const currentUser = group.members.find((m) => m.isCurrentUser);
  const currentUserId = currentUser?.id ?? group.members[0]?.id;

  const totalSpendMinor = groupExpenses.reduce((sum, e) => sum + e.amountMinor, 0);

  const pairwise: PairwiseBalance[] = [];
  let youOweMinor = 0;
  let youAreOwedMinor = 0;

  for (const member of group.members) {
    if (member.id === currentUserId) continue;
    const net = currentUserId ? netBetween(edges, currentUserId, member.id) : 0;
    pairwise.push({
      memberId: member.id,
      displayName: member.displayName,
      netMinor: net,
    });
    if (net > 0) youAreOwedMinor += net;
    else if (net < 0) youOweMinor += Math.abs(net);
  }

  const memberBalances = group.members.map((member) => {
    if (!currentUserId || member.id === currentUserId) {
      return {
        memberId: member.id,
        displayName: member.displayName,
        isCurrentUser: member.isCurrentUser,
        netMinor: 0,
      };
    }
    return {
      memberId: member.id,
      displayName: member.displayName,
      isCurrentUser: member.isCurrentUser,
      netMinor: netBetween(edges, currentUserId, member.id),
    };
  });

  const isSettled = youOweMinor === 0 && youAreOwedMinor === 0;

  return {
    totalSpendMinor,
    youOweMinor,
    youAreOwedMinor,
    isSettled,
    pairwise,
    memberBalances,
  };
}

export function isGroupSettled(
  group: SplitGroup,
  expenses: GroupExpense[],
  settlements: Settlement[]
): boolean {
  return selectGroupBalances(group, expenses, settlements).isSettled;
}

export function selectOverdueExpenseIds(
  expenses: GroupExpense[],
  groupId: string,
  thresholdDays = 30
): string[] {
  const now = Date.now();
  const ms = thresholdDays * 24 * 60 * 60 * 1000;
  return expenses
    .filter((e) => {
      if (e.groupId !== groupId || e.deletedAt) return false;
      const age = now - new Date(e.expenseDate).getTime();
      return age > ms;
    })
    .map((e) => e.id);
}

export function spendingByMonth(
  expenses: GroupExpense[],
  groupId: string
): Array<{ month: string; totalMinor: number }> {
  const map = new Map<string, number>();
  for (const e of expenses) {
    if (e.groupId !== groupId || e.deletedAt) continue;
    const month = e.expenseDate.slice(0, 7);
    map.set(month, (map.get(month) ?? 0) + e.amountMinor);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, totalMinor]) => ({ month, totalMinor }));
}

export function validateExpenseShares(
  amountMinor: number,
  splitMethod: SplitMethod,
  includedMemberIds: string[],
  shares: Array<{ memberId: string; valueMinor?: number; percentBps?: number }>
): string | null {
  if (includedMemberIds.length === 0) return 'Select at least one participant.';
  if (amountMinor <= 0) return 'Enter an amount greater than 0.';

  if (splitMethod === 'exact') {
    const sum = shares
      .filter((s) => includedMemberIds.includes(s.memberId))
      .reduce((acc, s) => acc + (s.valueMinor ?? 0), 0);
    if (sum !== amountMinor) return 'Custom amounts must equal the total.';
  }

  if (splitMethod === 'percentage') {
    const sumBps = shares
      .filter((s) => includedMemberIds.includes(s.memberId))
      .reduce((acc, s) => acc + (s.percentBps ?? 0), 0);
    if (sumBps !== 10_000) return 'Percentages must add up to 100%.';
  }

  return null;
}

export function amountToMinor(amount: number): number {
  return majorToMinor(amount);
}

export function createDefaultShares(
  splitMethod: SplitMethod,
  includedMemberIds: string[],
  amountMinor: number
): Array<{ memberId: string; valueMinor?: number; percentBps?: number }> {
  if (splitMethod === 'equal') {
    return includedMemberIds.map((memberId) => ({ memberId }));
  }
  if (splitMethod === 'exact') {
    const allocated = allocateEqualShares(amountMinor, includedMemberIds);
    return includedMemberIds.map((memberId) => ({
      memberId,
      valueMinor: allocated.get(memberId) ?? 0,
    }));
  }
  const count = includedMemberIds.length;
  const baseBps = Math.floor(10_000 / count);
  let remainder = 10_000 - baseBps * count;
  return includedMemberIds.map((memberId, i) => {
    let percentBps = baseBps;
    if (remainder > 0 && i === includedMemberIds.length - 1) {
      percentBps += remainder;
      remainder = 0;
    } else if (remainder > 0) {
      percentBps += 1;
      remainder -= 1;
    }
    return { memberId, percentBps };
  });
}

export function getCurrentUserMember(members: GroupMember[]): GroupMember | undefined {
  return members.find((m) => m.isCurrentUser) ?? members[0];
}
