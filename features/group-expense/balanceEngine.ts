import {
  AMOUNT_EXCEEDS_MAX_MESSAGE,
  MAX_INPUT_AMOUNT_MINOR,
  majorToMinor,
} from '@/features/debts/money';
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

const MIN_SHARE_WEIGHT = 1e-9;

/** Split amount proportionally by positive share weights (e.g. 2 shares vs 1 share). */
export function allocateShareWeights(
  amountMinor: number,
  rows: Array<{ memberId: string; shareParts: number }>
): Map<string, number> {
  if (amountMinor <= 0 || rows.length === 0) return new Map<string, number>();

  const weights = rows.map((r) => {
    const p = Number.isFinite(r.shareParts) && r.shareParts > 0 ? r.shareParts : MIN_SHARE_WEIGHT;
    return { memberId: r.memberId, parts: p };
  });
  const sumParts = weights.reduce((acc, r) => acc + r.parts, 0);
  if (!(sumParts > 0)) return new Map<string, number>();

  let accruedBps = 0;
  const pseudoBps = weights.map((w, index) => {
    if (index === weights.length - 1) {
      return { memberId: w.memberId, percentBps: 10_000 - accruedBps };
    }
    const bps = Math.floor((10_000 * w.parts) / sumParts);
    accruedBps += bps;
    return { memberId: w.memberId, percentBps: bps };
  });

  return allocatePercentShares(amountMinor, pseudoBps);
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
    case 'shares': {
      const rows = included.map((memberId) => {
        const row = expense.shares.find((s) => s.memberId === memberId);
        const parts = row?.shareParts;
        const shareParts =
          parts != null && Number.isFinite(parts) && parts > 0 ? parts : 1;
        return { memberId, shareParts };
      });
      return allocateShareWeights(expense.amountMinor, rows);
    }
    case 'adjustment': {
      const base = allocateEqualShares(expense.amountMinor, included);
      const final = new Map<string, number>();
      for (const memberId of included) {
        const row = expense.shares.find((s) => s.memberId === memberId);
        const adj = row?.adjustmentMinor ?? 0;
        final.set(memberId, (base.get(memberId) ?? 0) + adj);
      }
      return final;
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

/**
 * How much `fromMemberId` still owes `toMemberId` on the directed IOU graph (minor units).
 * A settlement from → to may not exceed this amount.
 */
export function getDirectedOutstandingMinor(
  expenses: GroupExpense[],
  settlements: Settlement[],
  groupId: string,
  fromMemberId: string,
  toMemberId: string
): number {
  if (fromMemberId === toMemberId) return 0;
  const edges = buildGroupEdges(expenses, settlements, groupId);
  return edges.get(edgeKey(fromMemberId, toMemberId)) ?? 0;
}

/** Net from member A's perspective toward B: positive means B owes A */
export function netBetween(edges: EdgeMap, memberA: string, memberB: string): number {
  const aOwesB = edges.get(edgeKey(memberA, memberB)) ?? 0;
  const bOwesA = edges.get(edgeKey(memberB, memberA)) ?? 0;
  return bOwesA - aOwesB;
}

/** Sum of pairwise nets vs each other member — group-neutral pool position (sums to ~0 across members). */
function netVersusEveryoneElse(edges: EdgeMap, memberId: string, allMemberIds: string[]): number {
  let net = 0;
  for (const otherId of allMemberIds) {
    if (otherId === memberId) continue;
    net += netBetween(edges, memberId, otherId);
  }
  return net;
}

/** Each member’s remaining split position vs the rest of the group (same math as balances, without a “viewer”). */
export function selectEveryMemberNet(
  group: SplitGroup,
  expenses: GroupExpense[],
  settlements: Settlement[]
): Array<{ memberId: string; displayName: string; netMinor: number }> {
  const groupExpenses = expenses.filter((e) => e.groupId === group.id && !e.deletedAt);
  const groupSettlements = settlements.filter((s) => s.groupId === group.id);
  const edges = buildGroupEdges(groupExpenses, groupSettlements, group.id);
  const ids = group.members.map((m) => m.id);

  return group.members.map((m) => ({
    memberId: m.id,
    displayName: m.displayName,
    netMinor: netVersusEveryoneElse(edges, m.id, ids),
  }));
}

/** True when every member’s net vs the group is zero (full ledger square). */
export function isGroupLedgerBalanced(
  group: SplitGroup,
  expenses: GroupExpense[],
  settlements: Settlement[]
): boolean {
  return selectEveryMemberNet(group, expenses, settlements).every((r) => r.netMinor === 0);
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
  shares: {
    memberId: string;
    valueMinor?: number;
    percentBps?: number;
    shareParts?: number;
    adjustmentMinor?: number;
  }[]
): string | null {
  if (includedMemberIds.length === 0) return 'Select at least one participant.';
  if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
    return 'Enter an amount greater than 0.';
  }
  if (amountMinor > MAX_INPUT_AMOUNT_MINOR) {
    return AMOUNT_EXCEEDS_MAX_MESSAGE;
  }

  if (splitMethod === 'exact') {
    for (const id of includedMemberIds) {
      const v = shares.find((s) => s.memberId === id)?.valueMinor ?? 0;
      if (!Number.isFinite(v) || v < 0) {
        return 'Custom amounts must be valid non-negative values.';
      }
      if (v > MAX_INPUT_AMOUNT_MINOR) {
        return AMOUNT_EXCEEDS_MAX_MESSAGE;
      }
    }
    const sum = shares
      .filter((s) => includedMemberIds.includes(s.memberId))
      .reduce((acc, s) => acc + (s.valueMinor ?? 0), 0);
    if (!Number.isFinite(sum) || sum !== amountMinor) return 'Custom amounts must equal the total.';
  }

  if (splitMethod === 'percentage') {
    const sumBps = shares
      .filter((s) => includedMemberIds.includes(s.memberId))
      .reduce((acc, s) => acc + (s.percentBps ?? 0), 0);
    if (sumBps !== 10_000) return 'Percentages must add up to 100%.';
  }

  if (splitMethod === 'shares') {
    for (const id of includedMemberIds) {
      const row = shares.find((s) => s.memberId === id);
      const parts = row?.shareParts;
      if (!Number.isFinite(parts) || (parts ?? 0) <= 0) {
        return 'Each included person needs a positive share weight.';
      }
    }
  }

  if (splitMethod === 'adjustment') {
    const base = allocateEqualShares(amountMinor, includedMemberIds);
    let sumAdj = 0;
    for (const id of includedMemberIds) {
      const row = shares.find((s) => s.memberId === id);
      const adj = row?.adjustmentMinor ?? 0;
      if (!Number.isFinite(adj) || Math.abs(adj) > MAX_INPUT_AMOUNT_MINOR) {
        return AMOUNT_EXCEEDS_MAX_MESSAGE;
      }
      sumAdj += adj;
      const final = (base.get(id) ?? 0) + adj;
      if (final < 0) return 'Adjustments would make someone owe less than zero.';
    }
    if (sumAdj !== 0) {
      return 'Adjustments must balance to zero (the sum of +/- amounts must be 0).';
    }
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
): Array<{
  memberId: string;
  valueMinor?: number;
  percentBps?: number;
  shareParts?: number;
  adjustmentMinor?: number;
}> {
  switch (splitMethod) {
    case 'equal':
      return includedMemberIds.map((memberId) => ({ memberId }));
    case 'exact': {
      const allocated = allocateEqualShares(amountMinor, includedMemberIds);
      return includedMemberIds.map((memberId) => ({
        memberId,
        valueMinor: allocated.get(memberId) ?? 0,
      }));
    }
    case 'percentage': {
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
    case 'shares':
      return includedMemberIds.map((memberId) => ({ memberId, shareParts: 1 }));
    case 'adjustment':
      return includedMemberIds.map((memberId) => ({ memberId, adjustmentMinor: 0 }));
    default:
      return includedMemberIds.map((memberId) => ({ memberId }));
  }
}

export function getCurrentUserMember(members: GroupMember[]): GroupMember | undefined {
  return members.find((m) => m.isCurrentUser) ?? members[0];
}

/** Total settlement volume involving a member in a group (paid + received). */
export function getMemberSettlementsTotalMinor(
  groupId: string,
  memberId: string | undefined,
  settlements: Settlement[]
): number {
  if (!memberId) return 0;
  return settlements
    .filter(
      (s) =>
        s.groupId === groupId &&
        (s.fromMemberId === memberId || s.toMemberId === memberId)
    )
    .reduce((sum, s) => sum + s.amountMinor, 0);
}

/** Any recorded settlement between two members (either direction). */
export function settlementsExistBetweenMembers(
  settlements: Settlement[],
  groupId: string,
  memberA: string,
  memberB: string
): boolean {
  return settlements.some(
    (s) =>
      s.groupId === groupId &&
      ((s.fromMemberId === memberA && s.toMemberId === memberB) ||
        (s.fromMemberId === memberB && s.toMemberId === memberA))
  );
}
