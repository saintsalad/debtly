import type { GroupExpense, GroupMember } from './groupDomain';
import { createDefaultShares, validateExpenseShares } from './balanceEngine';

function bumpExpenseVersion(version: number): number {
  return version + 1;
}

function expenseIncludedEveryonePreviouslyInGroup(
  expense: GroupExpense,
  rosterBeforeIncoming: readonly Pick<GroupMember, 'id'>[]
): boolean {
  if (expense.deletedAt) return false;
  const roster = new Set(rosterBeforeIncoming.map((m) => m.id));
  if (expense.includedMemberIds.length !== roster.size) return false;
  return expense.includedMemberIds.every((id) => roster.has(id));
}

export function reconcileExpenseSplitsWhenMemberJoins(params: {
  expenses: readonly GroupExpense[];
  groupId: string;
  rosterBeforeIncoming: readonly GroupMember[];
  incomingMemberId: string;
  nowIso: string;
}): GroupExpense[] {
  const { expenses, groupId, rosterBeforeIncoming, incomingMemberId, nowIso } = params;

  return expenses.map((e) => {
    if (e.groupId !== groupId) return e;
    if (e.deletedAt) return e;
    if (e.splitMethod === 'exact') return e;
    if (!expenseIncludedEveryonePreviouslyInGroup(e, rosterBeforeIncoming)) return e;
    if (incomingMemberId && e.includedMemberIds.includes(incomingMemberId)) return e;

    const included = [...e.includedMemberIds, incomingMemberId];
    const shares = createDefaultShares(e.splitMethod, included, e.amountMinor);
    const validation = validateExpenseShares(e.amountMinor, e.splitMethod, included, shares);
    if (validation !== null) return e;

    return {
      ...e,
      includedMemberIds: included,
      shares,
      updatedAt: nowIso,
      version: bumpExpenseVersion(e.version),
    };
  });
}
