import type {
  ActivityLogEntry,
  GroupExpense,
  GroupExpenseState,
  GroupMember,
  PendingOp,
  Settlement,
  SplitGroup,
} from '@/features/group-expense/types';
import type {
  activityLog,
  groupExpenses,
  groupMembers,
  groups,
  pendingOps,
  settlements,
} from '@/lib/db/schema';

export type GroupRow = typeof groups.$inferSelect;
export type GroupMemberRow = typeof groupMembers.$inferSelect;
export type GroupExpenseRow = typeof groupExpenses.$inferSelect;
export type SettlementRow = typeof settlements.$inferSelect;
export type ActivityLogRow = typeof activityLog.$inferSelect;
export type PendingOpRow = typeof pendingOps.$inferSelect;

export function groupToRow(group: SplitGroup): GroupRow {
  return {
    id: group.id,
    name: group.name,
    currency: group.currency ?? null,
    imageUri: group.imageUri ?? null,
    inviteCode: group.inviteCode,
    createdByMemberId: group.createdByMemberId ?? null,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
    version: group.version,
    syncMode: group.syncMode ?? 'local',
  };
}

export function memberToRow(member: GroupMember, groupId: string): GroupMemberRow {
  return {
    id: member.id,
    groupId,
    displayName: member.displayName,
    isCurrentUser: member.isCurrentUser,
    username: member.username ?? null,
    avatarUri: member.avatarUri ?? null,
    color: member.color ?? null,
    isPlaceholder: member.isPlaceholder ?? (member.isCurrentUser ? false : true),
    joinedAt: member.joinedAt,
  };
}

export function expenseToRow(expense: GroupExpense): GroupExpenseRow {
  return {
    id: expense.id,
    groupId: expense.groupId,
    title: expense.title,
    amountMinor: expense.amountMinor,
    currency: expense.currency,
    paidByMemberId: expense.paidByMemberId,
    splitMethod: expense.splitMethod,
    sharesJson: JSON.stringify(expense.shares),
    includedMemberIdsJson: JSON.stringify(expense.includedMemberIds),
    note: expense.note ?? null,
    receiptUri: expense.receiptUri ?? null,
    expenseDate: expense.expenseDate,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
    version: expense.version,
    deletedAt: expense.deletedAt ?? null,
  };
}

export function settlementToRow(settlement: Settlement): SettlementRow {
  return {
    id: settlement.id,
    groupId: settlement.groupId,
    fromMemberId: settlement.fromMemberId,
    toMemberId: settlement.toMemberId,
    amountMinor: settlement.amountMinor,
    note: settlement.note ?? null,
    settledAt: settlement.settledAt,
    version: settlement.version,
  };
}

export function activityToRow(entry: ActivityLogEntry): ActivityLogRow {
  return {
    id: entry.id,
    groupId: entry.groupId,
    kind: entry.kind,
    at: entry.at,
    actorMemberId: entry.actorMemberId,
    expenseId: entry.expenseId ?? null,
    settlementId: entry.settlementId ?? null,
    targetMemberId: entry.targetMemberId ?? null,
    title: entry.title,
    subtitle: entry.subtitle ?? null,
    amountMinor: entry.amountMinor ?? null,
  };
}

export function pendingOpToRow(op: PendingOp): PendingOpRow {
  return {
    id: op.id,
    op: op.op,
    entityId: op.entityId,
    version: op.version,
    clientId: op.clientId,
    createdAt: op.createdAt,
  };
}

export function rowToGroup(row: GroupRow, members: GroupMember[]): SplitGroup {
  const mode = row.syncMode;
  return {
    id: row.id,
    name: row.name,
    imageUri: row.imageUri ?? undefined,
    currency: row.currency ?? undefined,
    inviteCode: row.inviteCode,
    members,
    createdByMemberId: row.createdByMemberId ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    version: row.version,
    syncMode: mode === 'convex' ? 'convex' : 'local',
  };
}

export function rowToMember(row: GroupMemberRow): GroupMember {
  return {
    id: row.id,
    displayName: row.displayName,
    isCurrentUser: row.isCurrentUser,
    username: row.username ?? undefined,
    avatarUri: row.avatarUri ?? undefined,
    color: row.color ?? undefined,
    isPlaceholder: row.isPlaceholder,
    joinedAt: row.joinedAt,
  };
}

export function rowToExpense(row: GroupExpenseRow): GroupExpense {
  return {
    id: row.id,
    groupId: row.groupId,
    title: row.title,
    amountMinor: row.amountMinor,
    currency: row.currency,
    paidByMemberId: row.paidByMemberId,
    splitMethod: row.splitMethod as GroupExpense['splitMethod'],
    shares: JSON.parse(row.sharesJson) as GroupExpense['shares'],
    includedMemberIds: JSON.parse(row.includedMemberIdsJson) as string[],
    note: row.note ?? undefined,
    receiptUri: row.receiptUri ?? undefined,
    expenseDate: row.expenseDate,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    version: row.version,
    deletedAt: row.deletedAt ?? undefined,
  };
}

export function rowToSettlement(row: SettlementRow): Settlement {
  return {
    id: row.id,
    groupId: row.groupId,
    fromMemberId: row.fromMemberId,
    toMemberId: row.toMemberId,
    amountMinor: row.amountMinor,
    note: row.note ?? undefined,
    settledAt: row.settledAt,
    version: row.version,
  };
}

export function rowToActivity(row: ActivityLogRow): ActivityLogEntry {
  return {
    id: row.id,
    groupId: row.groupId,
    kind: row.kind as ActivityLogEntry['kind'],
    at: row.at,
    actorMemberId: row.actorMemberId,
    expenseId: row.expenseId ?? undefined,
    settlementId: row.settlementId ?? undefined,
    targetMemberId: row.targetMemberId ?? undefined,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    amountMinor: row.amountMinor ?? undefined,
  };
}

export function rowToPendingOp(row: PendingOpRow): PendingOp {
  return {
    id: row.id,
    op: row.op,
    entityId: row.entityId,
    version: row.version,
    clientId: row.clientId,
    createdAt: row.createdAt,
  };
}

export function assembleGroupState(
  groupRows: GroupRow[],
  memberRows: GroupMemberRow[],
  expenseRows: GroupExpenseRow[],
  settlementRows: SettlementRow[],
  activityRows: ActivityLogRow[],
  pendingOpRows: PendingOpRow[]
): GroupExpenseState {
  const membersByGroup = new Map<string, GroupMember[]>();
  for (const m of memberRows) {
    const list = membersByGroup.get(m.groupId) ?? [];
    list.push(rowToMember(m));
    membersByGroup.set(m.groupId, list);
  }

  return {
    groups: groupRows.map((g) => rowToGroup(g, membersByGroup.get(g.id) ?? [])),
    expenses: expenseRows.map(rowToExpense),
    settlements: settlementRows.map(rowToSettlement),
    activityLog: activityRows.map(rowToActivity),
    pendingOps: pendingOpRows.map(rowToPendingOp),
  };
}

export function flattenGroupState(state: GroupExpenseState): {
  groups: GroupRow[];
  members: GroupMemberRow[];
  expenses: GroupExpenseRow[];
  settlements: SettlementRow[];
  activity: ActivityLogRow[];
  pendingOps: PendingOpRow[];
} {
  const groupRows: GroupRow[] = [];
  const memberRows: GroupMemberRow[] = [];
  for (const group of state.groups) {
    groupRows.push(groupToRow(group));
    for (const member of group.members) {
      memberRows.push(memberToRow(member, group.id));
    }
  }
  return {
    groups: groupRows,
    members: memberRows,
    expenses: state.expenses.map(expenseToRow),
    settlements: state.settlements.map(settlementToRow),
    activity: state.activityLog.map(activityToRow),
    pendingOps: state.pendingOps.map(pendingOpToRow),
  };
}
