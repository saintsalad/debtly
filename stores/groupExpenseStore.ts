import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  getActorMemberId,
  logExpenseAdded,
  logExpenseDeleted,
  logExpenseEdited,
  logGroupCreated,
  logGroupUpdated,
  logMemberJoined,
  logMemberRemoved,
  logMemberRenamed,
  logSettlement,
  logSettlementsVoidedBetween,
  rebuildActivityLogFromState,
} from '@/features/group-expense/activityLog';
import {
  amountToMinor,
  createDefaultShares,
  getCurrentUserMember,
  getDirectedOutstandingMinor,
  selectGroupBalances,
  validateExpenseShares,
} from '@/features/group-expense/balanceEngine';
import { migratePersistedState } from '@/features/group-expense/billSplitMigration';
import { reconcileExpenseSplitsWhenMemberJoins } from '@/features/group-expense/memberJoinExpenseSplit';
import { AMOUNT_EXCEEDS_MAX_MESSAGE, MAX_INPUT_AMOUNT_MINOR } from '@/features/debts/money';
import type {
  ActivityLogEntry,
  AddExpenseInput,
  CreateGroupInput,
  GroupExpense,
  GroupExpenseState,
  GroupMember,
  RecordSettlementInput,
  Settlement,
  SplitGroup,
} from '@/features/group-expense/types';
import { INITIAL_GROUP_EXPENSE_STATE } from '@/lib/mocks/initialGroupExpenses';
import { zustandStorage } from '@/lib/storage';
import { generateId } from '@/lib/utils';
import { useDebtStore } from '@/stores/debtStore';
import { useProfileStore } from '@/stores/profileStore';

function generateInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function bumpVersion(version: number): number {
  return version + 1;
}

function prependActivityLog(
  activityLog: ActivityLogEntry[],
  ...entries: ActivityLogEntry[]
): ActivityLogEntry[] {
  return [...entries, ...activityLog];
}

function syncLedgerForGroup(
  groupId: string,
  groups: SplitGroup[],
  expenses: GroupExpense[],
  settlements: Settlement[]
) {
  const group = groups.find((g) => g.id === groupId);
  if (!group) return;
  useDebtStore.getState().syncGroupDebtsToLedger(group, expenses, settlements);
}

interface GroupExpenseStore extends GroupExpenseState {
  createGroup: (input: CreateGroupInput) => string | null;
  updateGroup: (id: string, updates: Partial<Pick<SplitGroup, 'name' | 'imageUri'>>) => void;
  deleteGroup: (id: string) => void;
  setGroupImage: (id: string, imageUri: string | undefined) => void;
  addMember: (groupId: string, displayName: string, username?: string) => string | null;
  renameMember: (groupId: string, memberId: string, displayName: string) => string | null;
  removeMember: (groupId: string, memberId: string) => void;
  addExpense: (input: AddExpenseInput) => string | null;
  updateExpense: (id: string, input: Partial<AddExpenseInput>) => string | null;
  deleteExpense: (id: string) => void;
  recordSettlement: (input: RecordSettlementInput) => string | null;
  joinGroupByCode: (code: string, displayName: string) => string | null;
  getInviteLink: (groupId: string) => string;
  getGroup: (id: string) => SplitGroup | undefined;
  getGroupExpenses: (groupId: string) => GroupExpense[];
  getGroupSettlements: (groupId: string) => Settlement[];
  /** Remove every settlement between you and another member; logs activity. */
  voidRecordedSettlementsWithMember: (
    groupId: string,
    viewerMemberId: string,
    otherMemberId: string
  ) => void;
  /** Record one settlement per non-zero pairwise balance vs the current user. */
  recordAllViewerPairwiseSettlements: (groupId: string) => string | null;
}

function createCurrentUserMember(name: string): GroupMember {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    displayName: name,
    isCurrentUser: true,
    joinedAt: now,
  };
}

export const useGroupExpenseStore = create<GroupExpenseStore>()(
  persist(
    (set, get) => ({
      ...INITIAL_GROUP_EXPENSE_STATE,

      createGroup: ({ name, memberNames = [], imageUri }) => {
        const trimmed = name.trim();
        if (!trimmed) return null;

        const profileName = useProfileStore.getState().name || 'You';
        const now = new Date().toISOString();
        const currentUser = createCurrentUserMember(profileName);

        const extraMembers: GroupMember[] = memberNames
          .map((n) => n.trim())
          .filter(Boolean)
          .map((displayName) => ({
            id: generateId(),
            displayName,
            isCurrentUser: false,
            joinedAt: now,
          }));

        const group: SplitGroup = {
          id: generateId(),
          name: trimmed,
          imageUri,
          inviteCode: generateInviteCode(),
          members: [currentUser, ...extraMembers],
          createdAt: now,
          updatedAt: now,
          version: 1,
        };

        const auditEntries: ActivityLogEntry[] = [
          logGroupCreated(group, currentUser.id),
        ];
        for (const member of extraMembers) {
          auditEntries.push(logMemberJoined(group, member.id, currentUser.id, now));
        }

        set((state) => ({
          groups: [group, ...state.groups],
          activityLog: prependActivityLog(state.activityLog, ...auditEntries),
        }));
        return group.id;
      },

      updateGroup: (id, updates) => {
        const existing = get().groups.find((g) => g.id === id);
        if (!existing) return;

        const now = new Date().toISOString();
        const actorId = getActorMemberId(existing);
        const auditEntries: ActivityLogEntry[] = [];

        if (updates.name?.trim() && updates.name.trim() !== existing.name) {
          auditEntries.push(
            logGroupUpdated(
              { ...existing, name: updates.name.trim() },
              actorId,
              now,
              `Name: ${existing.name} → ${updates.name.trim()}`
            )
          );
        }

        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === id
              ? {
                  ...g,
                  ...updates,
                  updatedAt: now,
                  version: bumpVersion(g.version),
                }
              : g
          ),
          activityLog:
            auditEntries.length > 0
              ? prependActivityLog(state.activityLog, ...auditEntries)
              : state.activityLog,
        }));
        const { groups, expenses, settlements } = get();
        syncLedgerForGroup(id, groups, expenses, settlements);
      },

      deleteGroup: (id) => {
        set((state) => ({
          groups: state.groups.filter((g) => g.id !== id),
          expenses: state.expenses.filter((e) => e.groupId !== id),
          settlements: state.settlements.filter((s) => s.groupId !== id),
          activityLog: state.activityLog.filter((e) => e.groupId !== id),
        }));
        useDebtStore.getState().removeGroupSyncedDebtsForGroup(id);
      },

      setGroupImage: (id, imageUri) => {
        get().updateGroup(id, { imageUri });
      },

      voidRecordedSettlementsWithMember: (groupId, viewerMemberId, otherMemberId) => {
        const group = get().groups.find((g) => g.id === groupId);
        if (!group) return;
        const now = new Date().toISOString();
        const actorId = getActorMemberId(group);
        const state = get();
        const removed = state.settlements.filter(
          (s) =>
            s.groupId === groupId &&
            ((s.fromMemberId === viewerMemberId && s.toMemberId === otherMemberId) ||
              (s.fromMemberId === otherMemberId && s.toMemberId === viewerMemberId))
        );
        if (removed.length === 0) return;
        const removeIds = new Set(removed.map((s) => s.id));
        const auditEntry = logSettlementsVoidedBetween(
          group,
          actorId,
          otherMemberId,
          removed.length,
          now
        );
        set((s) => ({
          settlements: s.settlements.filter((x) => !removeIds.has(x.id)),
          groups: s.groups.map((g) =>
            g.id === groupId
              ? { ...g, updatedAt: now, version: bumpVersion(g.version) }
              : g
          ),
          activityLog: prependActivityLog(s.activityLog, auditEntry),
        }));
        const { groups, expenses, settlements } = get();
        syncLedgerForGroup(groupId, groups, expenses, settlements);
      },

      recordAllViewerPairwiseSettlements: (groupId) => {
        const group = get().groups.find((g) => g.id === groupId);
        if (!group) return 'Group not found.';
        const expenses = get().expenses;
        const settlementsBaseline = get().settlements;
        const snap = selectGroupBalances(group, expenses, settlementsBaseline);
        const cu = getCurrentUserMember(group.members)?.id;
        if (!cu) return null;

        const now = new Date().toISOString();
        const actorId = getActorMemberId(group);
        const newSettlements: Settlement[] = [];
        const auditEntries: ActivityLogEntry[] = [];
        const pendingSettlements: Settlement[] = [...settlementsBaseline];

        for (const b of snap.memberBalances) {
          if (b.isCurrentUser || b.netMinor === 0) continue;
          const fromMemberId = b.netMinor > 0 ? b.memberId : cu;
          const toMemberId = b.netMinor > 0 ? cu : b.memberId;
          const capMinor = getDirectedOutstandingMinor(
            expenses,
            pendingSettlements,
            groupId,
            fromMemberId,
            toMemberId
          );
          const amountMinor = Math.min(Math.abs(b.netMinor), capMinor);
          if (amountMinor <= 0) continue;
          const settlement: Settlement = {
            id: generateId(),
            groupId,
            fromMemberId,
            toMemberId,
            amountMinor,
            settledAt: now,
            version: 1,
          };
          newSettlements.push(settlement);
          pendingSettlements.unshift(settlement);
          auditEntries.push(logSettlement(group, settlement, actorId));
        }

        if (newSettlements.length === 0) return null;

        set((s) => ({
          settlements: [...newSettlements, ...s.settlements],
          groups: s.groups.map((g) =>
            g.id === groupId ? { ...g, updatedAt: now, version: bumpVersion(g.version) } : g
          ),
          activityLog: prependActivityLog(s.activityLog, ...auditEntries),
        }));
        const { groups, expenses: ex, settlements: st } = get();
        syncLedgerForGroup(groupId, groups, ex, st);
        return null;
      },

      addMember: (groupId, displayName, username) => {
        const trimmed = displayName.trim();
        if (!trimmed) return null;

        const now = new Date().toISOString();
        const memberId = generateId();

        const groupBefore = get().groups.find((g) => g.id === groupId);
        if (!groupBefore) return null;

        const duplicate = groupBefore.members.find(
          (m) => m.displayName.toLowerCase() === trimmed.toLowerCase()
        );
        if (duplicate) return duplicate.id;

        const actorId = getActorMemberId(groupBefore);
        const auditEntry = logMemberJoined(groupBefore, memberId, actorId, now);

        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  members: [
                    ...g.members,
                    {
                      id: memberId,
                      displayName: trimmed,
                      isCurrentUser: false,
                      username,
                      joinedAt: now,
                    },
                  ],
                  updatedAt: now,
                  version: bumpVersion(g.version),
                }
              : g
          ),
          expenses: reconcileExpenseSplitsWhenMemberJoins({
            expenses: state.expenses,
            groupId,
            rosterBeforeIncoming: groupBefore.members,
            incomingMemberId: memberId,
            nowIso: now,
          }),
          activityLog: prependActivityLog(state.activityLog, auditEntry),
        }));

        const { groups, expenses, settlements } = get();
        syncLedgerForGroup(groupId, groups, expenses, settlements);
        return memberId;
      },

      renameMember: (groupId, memberId, displayName) => {
        const trimmed = displayName.trim();
        if (!trimmed) return 'Enter a name.';

        const group = get().groups.find((g) => g.id === groupId);
        const member = group?.members.find((m) => m.id === memberId);
        if (!member || member.isCurrentUser || !group) return 'Cannot rename this member.';

        const duplicate = group.members.find(
          (m) => m.id !== memberId && m.displayName.toLowerCase() === trimmed.toLowerCase()
        );
        if (duplicate) return 'A member with this name already exists.';

        if (member.displayName === trimmed) return null;

        const now = new Date().toISOString();
        const actorId = getActorMemberId(group);
        const auditEntry = logMemberRenamed(
          group,
          memberId,
          member.displayName,
          trimmed,
          actorId,
          now
        );

        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  members: g.members.map((m) =>
                    m.id === memberId ? { ...m, displayName: trimmed } : m
                  ),
                  updatedAt: now,
                  version: bumpVersion(g.version),
                }
              : g
          ),
          activityLog: prependActivityLog(state.activityLog, auditEntry),
        }));

        const { groups, expenses, settlements } = get();
        syncLedgerForGroup(groupId, groups, expenses, settlements);
        return null;
      },

      removeMember: (groupId, memberId) => {
        const group = get().groups.find((g) => g.id === groupId);
        const member = group?.members.find((m) => m.id === memberId);
        if (!member || member.isCurrentUser || !group) return;

        const now = new Date().toISOString();
        const actorId = getActorMemberId(group);
        const auditEntry = logMemberRemoved(group, member.displayName, actorId, now);

        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  members: g.members.filter((m) => m.id !== memberId),
                  updatedAt: now,
                  version: bumpVersion(g.version),
                }
              : g
          ),
          expenses: state.expenses.map((e) =>
            e.groupId === groupId
              ? {
                  ...e,
                  includedMemberIds: e.includedMemberIds.filter((id) => id !== memberId),
                  shares: e.shares.filter((s) => s.memberId !== memberId),
                }
              : e
          ),
          activityLog: prependActivityLog(state.activityLog, auditEntry),
        }));

        const { groups, expenses, settlements } = get();
        syncLedgerForGroup(groupId, groups, expenses, settlements);
      },

      addExpense: (input) => {
        const group = get().groups.find((g) => g.id === input.groupId);
        if (!group) return 'Group not found.';

        const amountMinor = amountToMinor(input.amount);
        const currency = useProfileStore.getState().currency;
        const included = input.includedMemberIds.length
          ? input.includedMemberIds
          : group.members.map((m) => m.id);

        const shares =
          input.shares ??
          createDefaultShares(input.splitMethod, included, amountMinor);

        const validation = validateExpenseShares(
          amountMinor,
          input.splitMethod,
          included,
          shares
        );
        if (validation) return validation;

        const now = new Date().toISOString();
        const expense: GroupExpense = {
          id: generateId(),
          groupId: input.groupId,
          title: input.title.trim(),
          amountMinor,
          currency,
          paidByMemberId: input.paidByMemberId,
          splitMethod: input.splitMethod,
          shares,
          includedMemberIds: included,
          note: input.note?.trim() || undefined,
          receiptUri: input.receiptUri,
          expenseDate: input.expenseDate ?? now,
          createdAt: now,
          updatedAt: now,
          version: 1,
        };

        const actorId = getActorMemberId(group);
        const auditEntry = logExpenseAdded(group, expense, actorId);

        set((state) => ({
          expenses: [expense, ...state.expenses],
          groups: state.groups.map((g) =>
            g.id === input.groupId ? { ...g, updatedAt: now, version: bumpVersion(g.version) } : g
          ),
          activityLog: prependActivityLog(state.activityLog, auditEntry),
        }));

        const { groups, expenses, settlements } = get();
        syncLedgerForGroup(input.groupId, groups, expenses, settlements);
        return null;
      },

      updateExpense: (id, input) => {
        const existing = get().expenses.find((e) => e.id === id);
        if (!existing || existing.deletedAt) return 'Expense not found.';

        const group = get().groups.find((g) => g.id === existing.groupId);
        if (!group) return 'Group not found.';

        const amountMinor =
          input.amount != null ? amountToMinor(input.amount) : existing.amountMinor;
        const splitMethod = input.splitMethod ?? existing.splitMethod;
        const included =
          input.includedMemberIds ?? existing.includedMemberIds;
        const shares =
          input.shares ??
          createDefaultShares(splitMethod, included, amountMinor);

        const validation = validateExpenseShares(
          amountMinor,
          splitMethod,
          included,
          shares
        );
        if (validation) return validation;

        const now = new Date().toISOString();
        const updated: GroupExpense = {
          ...existing,
          title: input.title?.trim() ?? existing.title,
          amountMinor,
          paidByMemberId: input.paidByMemberId ?? existing.paidByMemberId,
          splitMethod,
          shares,
          includedMemberIds: included,
          note: input.note !== undefined ? input.note?.trim() || undefined : existing.note,
          receiptUri: input.receiptUri !== undefined ? input.receiptUri : existing.receiptUri,
          expenseDate: input.expenseDate ?? existing.expenseDate,
          updatedAt: now,
          version: bumpVersion(existing.version),
        };

        const actorId = getActorMemberId(group);
        const auditEntry = logExpenseEdited(group, existing, updated, actorId, now);

        set((state) => ({
          expenses: state.expenses.map((e) => (e.id === id ? updated : e)),
          groups: state.groups.map((g) =>
            g.id === existing.groupId
              ? { ...g, updatedAt: now, version: bumpVersion(g.version) }
              : g
          ),
          activityLog: prependActivityLog(state.activityLog, auditEntry),
        }));

        const { groups, expenses, settlements } = get();
        syncLedgerForGroup(existing.groupId, groups, expenses, settlements);
        return null;
      },

      deleteExpense: (id) => {
        const existing = get().expenses.find((e) => e.id === id);
        if (!existing) return;

        const group = get().groups.find((g) => g.id === existing.groupId);
        if (!group) return;

        const now = new Date().toISOString();
        const actorId = getActorMemberId(group);
        const auditEntry = logExpenseDeleted(group, existing, actorId, now);

        set((state) => ({
          expenses: state.expenses.map((e) =>
            e.id === id ? { ...e, deletedAt: now, updatedAt: now, version: bumpVersion(e.version) } : e
          ),
          activityLog: prependActivityLog(state.activityLog, auditEntry),
        }));

        const { groups, expenses, settlements } = get();
        syncLedgerForGroup(existing.groupId, groups, expenses, settlements);
      },

      recordSettlement: (input) => {
        const group = get().groups.find((g) => g.id === input.groupId);
        if (!group) return 'Group not found.';
        if (input.fromMemberId === input.toMemberId) return 'Choose different members.';

        const amountMinor = amountToMinor(input.amount);
        if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
          return 'Enter an amount greater than 0.';
        }
        if (amountMinor > MAX_INPUT_AMOUNT_MINOR) {
          return AMOUNT_EXCEEDS_MAX_MESSAGE;
        }

        const capMinor = getDirectedOutstandingMinor(
          get().expenses,
          get().settlements,
          input.groupId,
          input.fromMemberId,
          input.toMemberId
        );
        if (capMinor <= 0) {
          return 'That balance is already settled up for this payer and recipient.';
        }
        if (amountMinor > capMinor) {
          return 'That amount is more than what is still owed for this payer and recipient.';
        }

        const settlement: Settlement = {
          id: generateId(),
          groupId: input.groupId,
          fromMemberId: input.fromMemberId,
          toMemberId: input.toMemberId,
          amountMinor,
          note: input.note?.trim() || undefined,
          settledAt: new Date().toISOString(),
          version: 1,
        };

        const actorId = getActorMemberId(group);
        const auditEntry = logSettlement(group, settlement, actorId);

        set((state) => ({
          settlements: [settlement, ...state.settlements],
          groups: state.groups.map((g) =>
            g.id === input.groupId
              ? {
                  ...g,
                  updatedAt: settlement.settledAt,
                  version: bumpVersion(g.version),
                }
              : g
          ),
          activityLog: prependActivityLog(state.activityLog, auditEntry),
        }));

        const { groups, expenses, settlements } = get();
        syncLedgerForGroup(input.groupId, groups, expenses, settlements);
        return null;
      },

      joinGroupByCode: (code, displayName) => {
        const normalized = code.trim().toUpperCase();
        const group = get().groups.find((g) => g.inviteCode === normalized);
        if (!group) return null;

        const trimmed = displayName.trim() || 'Guest';
        const existing = group.members.find(
          (m) => m.displayName.toLowerCase() === trimmed.toLowerCase()
        );
        if (existing) return group.id;

        get().addMember(group.id, trimmed);
        return group.id;
      },

      getInviteLink: (groupId) => {
        const group = get().groups.find((g) => g.id === groupId);
        if (!group) return 'debtly://group/join';
        return `debtly://group/join?code=${group.inviteCode}`;
      },

      getGroup: (id) => get().groups.find((g) => g.id === id),

      getGroupExpenses: (groupId) =>
        get().expenses.filter((e) => e.groupId === groupId && !e.deletedAt),

      getGroupSettlements: (groupId) =>
        get().settlements.filter((s) => s.groupId === groupId),
    }),
    {
      name: 'debtly-group-expenses',
      version: 4,
      storage: createJSONStorage(() => zustandStorage),
      migrate: (persistedState, version) => {
        if (version < 2) {
          return INITIAL_GROUP_EXPENSE_STATE;
        }
        const profileName = useProfileStore.getState().name || 'You';
        let migrated = migratePersistedState(persistedState, profileName);
        if (version < 3 && migrated.activityLog.length === 0 && migrated.groups.length > 0) {
          migrated = { ...migrated, activityLog: rebuildActivityLogFromState(migrated) };
        }
        if (version < 4) {
          migrated = {
            ...migrated,
            groups: migrated.groups.map((g) => {
              const { informalBalanceSettled: _removed, ...rest } = g as SplitGroup & {
                informalBalanceSettled?: Record<string, boolean>;
              };
              return rest;
            }),
          };
        }
        return migrated;
      },
      onRehydrateStorage: () => (state) => {
        void (async () => {
          let hydrated = state;
          if (!hydrated?.groups?.length) {
            const legacyRaw = await zustandStorage.getItem('debtly-bill-splits');
            if (legacyRaw) {
              try {
                const parsed = JSON.parse(legacyRaw) as { state?: unknown };
                const profileName = useProfileStore.getState().name || 'You';
                const migrated = migratePersistedState(parsed.state ?? parsed, profileName);
                useGroupExpenseStore.setState(migrated);
                hydrated = useGroupExpenseStore.getState();
              } catch {
                // ignore corrupt legacy payload
              }
            }
          }
          if (!hydrated) return;
          for (const group of hydrated.groups) {
            syncLedgerForGroup(group.id, hydrated.groups, hydrated.expenses, hydrated.settlements);
          }
        })();
      },
    }
  )
);
