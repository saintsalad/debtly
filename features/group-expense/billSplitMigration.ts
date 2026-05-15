import { rebuildActivityLogFromState } from '@/features/group-expense/activityLog';
import { majorToMinor } from '@/features/debts/money';
import { generateId } from '@/lib/utils';
import type {
  GroupExpense,
  GroupExpenseState,
  GroupMember,
  LegacyBillSplit,
  SplitGroup,
} from '@/features/group-expense/types';

function generateInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function migrateBillSplitsToGroups(
  legacySplits: LegacyBillSplit[],
  currentUserName = 'You'
): GroupExpenseState {
  const groups: SplitGroup[] = [];
  const expenses: GroupExpense[] = [];

  for (const split of legacySplits) {
    const now = new Date().toISOString();
    const currentUserId = generateId();
    const currentUser: GroupMember = {
      id: currentUserId,
      displayName: currentUserName,
      isCurrentUser: true,
      joinedAt: split.createdAt,
    };

    const members: GroupMember[] = [
      currentUser,
      ...split.participants.map((p) => ({
        id: p.id,
        displayName: p.name,
        isCurrentUser: false,
        joinedAt: split.createdAt,
      })),
    ];

    const groupId = `migrated-${split.id}`;
    const group: SplitGroup = {
      id: groupId,
      name: split.title,
      inviteCode: generateInviteCode(),
      members,
      createdAt: split.createdAt,
      updatedAt: split.updatedAt,
      version: 1,
    };
    groups.push(group);

    const amountMinor = majorToMinor(split.total);
    const includedMemberIds = members.map((m) => m.id);
    const expense: GroupExpense = {
      id: `exp-${split.id}`,
      groupId,
      title: split.title,
      amountMinor,
      currency: 'PHP',
      paidByMemberId: currentUserId,
      splitMethod: 'exact',
      shares: split.participants.map((p) => ({
        memberId: p.id,
        valueMinor: majorToMinor(p.amount),
      })),
      includedMemberIds: [
        currentUserId,
        ...split.participants.map((p) => p.id),
      ],
      expenseDate: split.createdAt,
      createdAt: split.createdAt,
      updatedAt: split.updatedAt,
      version: 1,
    };
    expenses.push(expense);
  }

  const state: GroupExpenseState = {
    groups,
    expenses,
    settlements: [],
    activityLog: [],
    pendingOps: [],
  };
  return { ...state, activityLog: rebuildActivityLogFromState(state) };
}

export function migratePersistedState(
  persisted: unknown,
  currentUserName: string
): GroupExpenseState {
  if (!persisted || typeof persisted !== 'object') {
    const empty: GroupExpenseState = {
      groups: [],
      expenses: [],
      settlements: [],
      activityLog: [],
      pendingOps: [],
    };
    return empty;
  }

  const state = persisted as Record<string, unknown>;

  let migrated: GroupExpenseState;

  if (Array.isArray(state.groups)) {
    migrated = {
      groups: (state.groups as SplitGroup[]) ?? [],
      expenses: (state.expenses as GroupExpense[]) ?? [],
      settlements: (state.settlements as GroupExpenseState['settlements']) ?? [],
      activityLog: (state.activityLog as GroupExpenseState['activityLog']) ?? [],
      pendingOps: (state.pendingOps as GroupExpenseState['pendingOps']) ?? [],
    };
  } else if (Array.isArray(state.splits)) {
    migrated = migrateBillSplitsToGroups(state.splits as LegacyBillSplit[], currentUserName);
  } else {
    migrated = { groups: [], expenses: [], settlements: [], activityLog: [], pendingOps: [] };
  }

  if (migrated.activityLog.length === 0 && migrated.groups.length > 0) {
    migrated = { ...migrated, activityLog: rebuildActivityLogFromState(migrated) };
  }

  return migrated;
}
