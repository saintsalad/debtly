import { minorToMajor } from '@/features/debts/money';
import type {
  ActivityItem,
  ActivityKind,
  ActivityLogEntry,
  GroupExpense,
  GroupExpenseState,
  Settlement,
  SplitGroup,
} from '@/features/group-expense/types';
import { getCurrentUserMember } from '@/features/group-expense/balanceEngine';
import { generateId, getCurrencyMeta } from '@/lib/utils';

function memberName(group: SplitGroup, memberId?: string): string {
  if (!memberId) return 'Someone';
  return group.members.find((m) => m.id === memberId)?.displayName ?? 'Someone';
}

/**
 * Roster display name for activity / audit rows. Never maps to \"You\", so logs read clearly for every member.
 */
export function auditActorName(group: SplitGroup, memberId: string): string {
  const raw = memberName(group, memberId);
  const t = raw.trim();
  return t.length > 0 ? t : 'Someone';
}

/** Viewer-relative label (may show \"You\"). Prefer {@link auditActorName} when writing shared activity copy. */
export function actorLabel(group: SplitGroup, actorMemberId: string): string {
  const current = getCurrentUserMember(group.members);
  if (current && actorMemberId === current.id) return 'You';
  return memberName(group, actorMemberId);
}

function splitMethodLabel(method: GroupExpense['splitMethod']): string {
  switch (method) {
    case 'exact':
      return 'Custom split';
    case 'percentage':
      return 'Percent split';
    case 'shares':
      return 'Share split';
    case 'adjustment':
      return 'Adjustment split';
    case 'equal':
    default:
      return 'Equal split';
  }
}

export function getActorMemberId(group: SplitGroup): string {
  const current = getCurrentUserMember(group.members);
  return current?.id ?? group.members[0]?.id ?? '';
}

export function createLogEntry(
  partial: Omit<ActivityLogEntry, 'id'> & { id?: string }
): ActivityLogEntry {
  return {
    id: partial.id ?? generateId(),
    ...partial,
  };
}

function fmtMinor(amountMinor: number, currency: string): string {
  const symbol = getCurrencyMeta(currency).symbol;
  return `${symbol}${minorToMajor(amountMinor).toFixed(2)}`;
}

export function describeExpenseChanges(
  before: GroupExpense,
  after: GroupExpense,
  group: SplitGroup
): string {
  const parts: string[] = [];
  const currency = after.currency;

  if (before.title !== after.title) {
    parts.push(`Title: ${before.title} → ${after.title}`);
  }
  if (before.amountMinor !== after.amountMinor) {
    parts.push(
      `Amount: ${fmtMinor(before.amountMinor, currency)} → ${fmtMinor(after.amountMinor, currency)}`
    );
  }
  if (before.paidByMemberId !== after.paidByMemberId) {
    parts.push(
      `Paid by: ${memberName(group, before.paidByMemberId)} → ${memberName(group, after.paidByMemberId)}`
    );
  }
  if (before.splitMethod !== after.splitMethod) {
    parts.push(
      `Split: ${splitMethodLabel(before.splitMethod)} → ${splitMethodLabel(after.splitMethod)}`
    );
  }
  if (before.includedMemberIds.length !== after.includedMemberIds.length) {
    parts.push('Participants updated');
  } else if (JSON.stringify(before.shares) !== JSON.stringify(after.shares)) {
    parts.push('Split amounts updated');
  }

  return parts.length > 0 ? parts.join('\n') : 'Details updated';
}

export function logExpenseAdded(
  group: SplitGroup,
  expense: GroupExpense,
  actorMemberId: string
): ActivityLogEntry {
  const actor = auditActorName(group, actorMemberId);
  const payer = memberName(group, expense.paidByMemberId);
  return createLogEntry({
    groupId: group.id,
    kind: 'expense_added',
    at: expense.createdAt,
    actorMemberId,
    expenseId: expense.id,
    title: expense.title,
    subtitle: `${actor} added · Paid by ${payer} · ${splitMethodLabel(expense.splitMethod)}`,
    amountMinor: expense.amountMinor,
  });
}

export function logExpenseEdited(
  group: SplitGroup,
  before: GroupExpense,
  after: GroupExpense,
  actorMemberId: string,
  at: string
): ActivityLogEntry {
  const actor = auditActorName(group, actorMemberId);
  return createLogEntry({
    groupId: group.id,
    kind: 'expense_edited',
    at,
    actorMemberId,
    expenseId: after.id,
    title: `${actor} edited ${after.title}`,
    subtitle: describeExpenseChanges(before, after, group),
  });
}

export function logExpenseDeleted(
  group: SplitGroup,
  expense: GroupExpense,
  actorMemberId: string,
  at: string
): ActivityLogEntry {
  const actor = auditActorName(group, actorMemberId);
  return createLogEntry({
    groupId: group.id,
    kind: 'expense_deleted',
    at,
    actorMemberId,
    expenseId: expense.id,
    title: `${actor} deleted ${expense.title}`,
    amountMinor: expense.amountMinor,
  });
}

export function logSettlement(
  group: SplitGroup,
  settlement: Settlement,
  actorMemberId: string,
  options?: { directedOutstandingBeforeMinor?: number }
): ActivityLogEntry {
  const from = auditActorName(group, settlement.fromMemberId);
  const to = auditActorName(group, settlement.toMemberId);
  const recorder = auditActorName(group, actorMemberId);
  const note = settlement.note?.trim();
  const currency =
    typeof group.currency === 'string' && group.currency.trim().length >= 3
      ? group.currency.trim().toUpperCase().slice(0, 3)
      : 'USD';
  const cap = options?.directedOutstandingBeforeMinor;
  const paid = settlement.amountMinor;
  const isPartial =
    cap != null && cap > 0 && paid > 0 && paid < cap;

  const paidStr = fmtMinor(paid, currency);
  const subtitle = isPartial
    ? `Partial payment: ${paidStr} of ${fmtMinor(cap, currency)} still owed · Recorded by ${recorder}${
        note ? ` · ${note}` : ''
      }`
    : note
      ? `Recorded by ${recorder} · ${note}`
      : `Recorded by ${recorder}`;

  return createLogEntry({
    groupId: group.id,
    kind: 'settlement_recorded',
    at: settlement.settledAt,
    actorMemberId,
    settlementId: settlement.id,
    title: `${from} paid ${to}`,
    subtitle,
    amountMinor: settlement.amountMinor,
  });
}

export function logSettlementsVoidedBetween(
  group: SplitGroup,
  actorMemberId: string,
  otherMemberId: string,
  removedCount: number,
  at: string
): ActivityLogEntry {
  const actor = auditActorName(group, actorMemberId);
  const other = auditActorName(group, otherMemberId);
  return createLogEntry({
    groupId: group.id,
    kind: 'settlements_voided',
    at,
    actorMemberId,
    targetMemberId: otherMemberId,
    title: `${actor} marked ${other} as unpaid again`,
    subtitle:
      removedCount > 1
        ? `${removedCount} recorded payments between ${actor} and ${other} were removed.`
        : `Recorded payment between ${actor} and ${other} was removed.`,
  });
}

export function logMemberJoined(
  group: SplitGroup,
  memberId: string,
  actorMemberId: string,
  at: string
): ActivityLogEntry {
  const actor = auditActorName(group, actorMemberId);
  const joined = memberName(group, memberId);
  return createLogEntry({
    groupId: group.id,
    kind: 'member_joined',
    at,
    actorMemberId,
    targetMemberId: memberId,
    title: `${actor} added ${joined}`,
  });
}

export function logMemberRemoved(
  group: SplitGroup,
  removedName: string,
  actorMemberId: string,
  at: string
): ActivityLogEntry {
  const actor = auditActorName(group, actorMemberId);
  return createLogEntry({
    groupId: group.id,
    kind: 'member_removed',
    at,
    actorMemberId,
    title: `${actor} removed ${removedName}`,
  });
}

export function logMemberRenamed(
  group: SplitGroup,
  memberId: string,
  previousName: string,
  nextName: string,
  actorMemberId: string,
  at: string
): ActivityLogEntry {
  const actor = auditActorName(group, actorMemberId);
  return createLogEntry({
    groupId: group.id,
    kind: 'member_renamed',
    at,
    actorMemberId,
    targetMemberId: memberId,
    title: `${actor} renamed ${previousName}`,
    subtitle: `${previousName} → ${nextName}`,
  });
}

export function logGroupCreated(group: SplitGroup, actorMemberId: string): ActivityLogEntry {
  const actor = auditActorName(group, actorMemberId);
  return createLogEntry({
    groupId: group.id,
    kind: 'group_created',
    at: group.createdAt,
    actorMemberId,
    title: `${actor} created ${group.name}`,
  });
}

/**
 * Invite host — persisting `SplitGroup.createdByMemberId` preferred; fallback to oldest `group_created` log row.
 */
export function getGroupCreatorMemberId(
  group: SplitGroup,
  activityLog: readonly ActivityLogEntry[]
): string | undefined {
  if (group.createdByMemberId) return group.createdByMemberId;

  const createdEntries = activityLog
    .filter((e) => e.groupId === group.id && e.kind === 'group_created')
    .slice()
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  const fromLog = createdEntries[0]?.actorMemberId;
  if (fromLog) return fromLog;

  if (group.members.length === 0) return undefined;
  return [...group.members].sort((a, b) => a.joinedAt.localeCompare(b.joinedAt))[0]?.id;
}

/** True when the viewer’s member row matches the group creator (invite host). */
export function isViewerGroupHost(
  group: SplitGroup,
  activityLog: readonly ActivityLogEntry[],
  viewerMemberId: string | undefined
): boolean {
  if (!viewerMemberId) return false;
  const creatorId = getGroupCreatorMemberId(group, activityLog);
  return creatorId !== undefined && creatorId === viewerMemberId;
}

export function logGroupUpdated(
  group: SplitGroup,
  actorMemberId: string,
  at: string,
  detail: string
): ActivityLogEntry {
  const actor = auditActorName(group, actorMemberId);
  return createLogEntry({
    groupId: group.id,
    kind: 'group_updated',
    at,
    actorMemberId,
    title: `${actor} updated the group`,
    subtitle: detail,
  });
}

/** Rebuild audit log from current entities (migration / repair). */
export function rebuildActivityLogFromState(state: GroupExpenseState): ActivityLogEntry[] {
  const entries: ActivityLogEntry[] = [];

  for (const group of state.groups) {
    const actorId = getCurrentUserMember(group.members)?.id ?? group.members[0]?.id ?? '';
    entries.push(logGroupCreated(group, actorId));

    for (const expense of state.expenses) {
      if (expense.groupId !== group.id) continue;
      const addActor = expense.paidByMemberId;
      entries.push(logExpenseAdded(group, expense, addActor));

      if (expense.updatedAt !== expense.createdAt && !expense.deletedAt) {
        entries.push(
          logExpenseEdited(group, expense, expense, actorId, expense.updatedAt)
        );
      }
      if (expense.deletedAt) {
        entries.push(logExpenseDeleted(group, expense, actorId, expense.deletedAt));
      }
    }

    for (const settlement of state.settlements) {
      if (settlement.groupId !== group.id) continue;
      entries.push(logSettlement(group, settlement, settlement.fromMemberId));
    }
  }

  return entries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export function buildGroupActivityFeed(
  groupId: string,
  activityLog: ActivityLogEntry[]
): ActivityItem[] {
  return activityLog
    .filter((e) => e.groupId === groupId)
    .map((entry) => ({ ...entry }))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export function isExpenseTappable(
  kind: ActivityKind,
  expenseId: string | undefined,
  expenses: GroupExpense[]
): boolean {
  if (!expenseId) return false;
  const expense = expenses.find((e) => e.id === expenseId);
  if (!expense || expense.deletedAt) return false;
  return kind === 'expense_added';
}
