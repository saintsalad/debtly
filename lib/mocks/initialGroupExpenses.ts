import { subDays, subWeeks } from 'date-fns';
import { rebuildActivityLogFromState } from '@/features/group-expense/activityLog';
import type {
  GroupExpense,
  GroupExpenseState,
  GroupMember,
  Settlement,
  SplitGroup,
} from '@/features/group-expense/types';

const NOW = new Date();

/**
 * Mock scenario groups for QA — each group is You + 3 members.
 * Clear app data or delete `debtly-group-expenses` from storage to reload seeds.
 *
 * | Group              | Your role      | Expected balance (approx)     |
 * |--------------------|----------------|-------------------------------|
 * | Friday dinner      | Host (payer)   | You are owed ₱1,350           |
 * | Bali trip          | Member (guest) | You owe Mia ₱3,200             |
 * | Roommates          | Host + partial | You are owed ₱750 (2 unsettled)|
 * | Concert night      | Mixed payers   | You owe Jordan ₱1,050          |
 * | Coffee club        | Host, settled  | All settled up                 |
 */

const YOU_ID = 'ge-you';

function member(
  id: string,
  displayName: string,
  isCurrentUser: boolean,
  joinedAt: Date
): GroupMember {
  return {
    id,
    displayName,
    isCurrentUser,
    joinedAt: joinedAt.toISOString(),
  };
}

function expense(
  partial: Omit<
    GroupExpense,
    'currency' | 'splitMethod' | 'shares' | 'version' | 'includedMemberIds'
  > & {
    memberIds: string[];
  }
): GroupExpense {
  const { memberIds, ...rest } = partial;
  return {
    currency: 'PHP',
    splitMethod: 'equal',
    shares: memberIds.map((memberId) => ({ memberId })),
    includedMemberIds: memberIds,
    version: 1,
    ...rest,
  };
}

export const INITIAL_GROUP_EXPENSE_STATE: GroupExpenseState = (() => {
  const youJoined = subWeeks(NOW, 8);

  const alex = 'ge-m-alex';
  const mia = 'ge-m-mia';
  const jordan = 'ge-m-jordan';
  const sam = 'ge-m-sam';
  const casey = 'ge-m-casey';
  const riley = 'ge-m-riley';

  // ─── Scenario 1: You are the host (you paid) — others owe you ───
  const s1Created = subDays(NOW, 3);
  const s1Members = [
    member(YOU_ID, 'You', true, s1Created),
    member(alex, 'Alex', false, s1Created),
    member(mia, 'Mia', false, s1Created),
    member(jordan, 'Jordan', false, s1Created),
  ];
  const s1Ids = s1Members.map((m) => m.id);
  const scenarioHostOwed: SplitGroup = {
    id: 'ge-scenario-host-owed',
    name: 'Friday dinner',
    inviteCode: 'HOST01',
    members: s1Members,
    createdByMemberId: YOU_ID,
    createdAt: s1Created.toISOString(),
    updatedAt: s1Created.toISOString(),
    version: 1,
  };

  // ─── Scenario 2: You are NOT the host — Mia paid, you owe ───
  const s2Created = subDays(NOW, 6);
  const s2Members = [
    member(YOU_ID, 'You', true, s2Created),
    member(mia, 'Mia', false, s2Created),
    member(sam, 'Sam', false, s2Created),
    member(casey, 'Casey', false, s2Created),
  ];
  const s2Ids = s2Members.map((m) => m.id);
  const scenarioGuestOwes: SplitGroup = {
    id: 'ge-scenario-guest-owes',
    name: 'Bali trip',
    inviteCode: 'GUEST2',
    members: s2Members,
    createdByMemberId: YOU_ID,
    createdAt: s2Created.toISOString(),
    updatedAt: s2Created.toISOString(),
    version: 1,
  };

  // ─── Scenario 3: You are host — partial settlements recorded ───
  const s3Created = subDays(NOW, 10);
  const s3Members = [
    member(YOU_ID, 'You', true, s3Created),
    member(alex, 'Alex', false, s3Created),
    member(sam, 'Sam', false, s3Created),
    member(riley, 'Riley', false, s3Created),
  ];
  const s3Ids = s3Members.map((m) => m.id);
  const scenarioHostPartial: SplitGroup = {
    id: 'ge-scenario-host-partial',
    name: 'Roommates',
    inviteCode: 'ROOM03',
    members: s3Members,
    createdByMemberId: YOU_ID,
    createdAt: s3Created.toISOString(),
    updatedAt: subDays(NOW, 2).toISOString(),
    version: 1,
  };

  // ─── Scenario 4: Mixed — Jordan paid main bill, you paid snacks ───
  const s4Created = subDays(NOW, 14);
  const s4Members = [
    member(YOU_ID, 'You', true, s4Created),
    member(jordan, 'Jordan', false, s4Created),
    member(mia, 'Mia', false, s4Created),
    member(casey, 'Casey', false, s4Created),
  ];
  const s4Ids = s4Members.map((m) => m.id);
  const scenarioMixed: SplitGroup = {
    id: 'ge-scenario-mixed',
    name: 'Concert night',
    inviteCode: 'MIXD04',
    members: s4Members,
    createdByMemberId: YOU_ID,
    createdAt: s4Created.toISOString(),
    updatedAt: s4Created.toISOString(),
    version: 1,
  };

  // ─── Scenario 5: You were host — everyone settled up ───
  const s5Created = subWeeks(NOW, 3);
  const s5Members = [
    member(YOU_ID, 'You', true, s5Created),
    member(alex, 'Alex', false, s5Created),
    member(mia, 'Mia', false, s5Created),
    member(sam, 'Sam', false, s5Created),
  ];
  const s5Ids = s5Members.map((m) => m.id);
  const scenarioSettled: SplitGroup = {
    id: 'ge-scenario-settled',
    name: 'Coffee club',
    inviteCode: 'DONE05',
    members: s5Members,
    createdByMemberId: YOU_ID,
    createdAt: s5Created.toISOString(),
    updatedAt: subDays(NOW, 1).toISOString(),
    version: 1,
  };

  const expenses: GroupExpense[] = [
    // S1: You paid ₱2,400 dinner + ₱1,200 drinks → owed ₱1,350 (3 × ₱450)
    expense({
      id: 'ge-exp-s1-dinner',
      groupId: scenarioHostOwed.id,
      title: 'Dinner at Lola',
      amountMinor: 240_000,
      paidByMemberId: YOU_ID,
      memberIds: s1Ids,
      expenseDate: s1Created.toISOString(),
      createdAt: s1Created.toISOString(),
      updatedAt: s1Created.toISOString(),
    }),
    expense({
      id: 'ge-exp-s1-drinks',
      groupId: scenarioHostOwed.id,
      title: 'After-dinner drinks',
      amountMinor: 120_000,
      paidByMemberId: YOU_ID,
      memberIds: s1Ids,
      expenseDate: subDays(NOW, 2).toISOString(),
      createdAt: subDays(NOW, 2).toISOString(),
      updatedAt: subDays(NOW, 2).toISOString(),
    }),

    // S2: Mia paid ₱12,800 trip costs → you owe ₱3,200
    expense({
      id: 'ge-exp-s2-hotel',
      groupId: scenarioGuestOwes.id,
      title: 'Hotel (3 nights)',
      amountMinor: 1_000_000,
      paidByMemberId: mia,
      memberIds: s2Ids,
      expenseDate: s2Created.toISOString(),
      createdAt: s2Created.toISOString(),
      updatedAt: s2Created.toISOString(),
    }),
    expense({
      id: 'ge-exp-s2-transport',
      groupId: scenarioGuestOwes.id,
      title: 'Airport transfers',
      amountMinor: 280_000,
      paidByMemberId: mia,
      memberIds: s2Ids,
      expenseDate: subDays(NOW, 5).toISOString(),
      createdAt: subDays(NOW, 5).toISOString(),
      updatedAt: subDays(NOW, 5).toISOString(),
    }),

    // S3: You paid ₱2,000 groceries → ₱500 each; Alex paid you back
    expense({
      id: 'ge-exp-s3-groceries',
      groupId: scenarioHostPartial.id,
      title: 'Weekly groceries',
      amountMinor: 200_000,
      paidByMemberId: YOU_ID,
      memberIds: s3Ids,
      expenseDate: s3Created.toISOString(),
      createdAt: s3Created.toISOString(),
      updatedAt: s3Created.toISOString(),
    }),

    // S4: Jordan ₱4,800 tickets, You ₱600 snacks → net you owe Jordan
    expense({
      id: 'ge-exp-s4-tickets',
      groupId: scenarioMixed.id,
      title: 'Concert tickets',
      amountMinor: 480_000,
      paidByMemberId: jordan,
      memberIds: s4Ids,
      expenseDate: s4Created.toISOString(),
      createdAt: s4Created.toISOString(),
      updatedAt: s4Created.toISOString(),
    }),
    expense({
      id: 'ge-exp-s4-snacks',
      groupId: scenarioMixed.id,
      title: 'Merch & snacks',
      amountMinor: 60_000,
      paidByMemberId: YOU_ID,
      memberIds: s4Ids,
      expenseDate: subDays(NOW, 13).toISOString(),
      createdAt: subDays(NOW, 13).toISOString(),
      updatedAt: subDays(NOW, 13).toISOString(),
    }),

    // S5: You paid ₱800 coffee run — all members settled
    expense({
      id: 'ge-exp-s5-coffee',
      groupId: scenarioSettled.id,
      title: 'Saturday coffee run',
      amountMinor: 80_000,
      paidByMemberId: YOU_ID,
      memberIds: s5Ids,
      expenseDate: s5Created.toISOString(),
      createdAt: s5Created.toISOString(),
      updatedAt: s5Created.toISOString(),
    }),
  ];

  const settlements: Settlement[] = [
    {
      id: 'ge-set-s3-alex',
      groupId: scenarioHostPartial.id,
      fromMemberId: alex,
      toMemberId: YOU_ID,
      amountMinor: 50_000,
      note: 'GCash',
      settledAt: subDays(NOW, 4).toISOString(),
      version: 1,
    },
    {
      id: 'ge-set-s5-alex',
      groupId: scenarioSettled.id,
      fromMemberId: alex,
      toMemberId: YOU_ID,
      amountMinor: 20_000,
      settledAt: subDays(NOW, 2).toISOString(),
      version: 1,
    },
    {
      id: 'ge-set-s5-mia',
      groupId: scenarioSettled.id,
      fromMemberId: mia,
      toMemberId: YOU_ID,
      amountMinor: 20_000,
      settledAt: subDays(NOW, 2).toISOString(),
      version: 1,
    },
    {
      id: 'ge-set-s5-sam',
      groupId: scenarioSettled.id,
      fromMemberId: sam,
      toMemberId: YOU_ID,
      amountMinor: 20_000,
      settledAt: subDays(NOW, 1).toISOString(),
      version: 1,
    },
  ];

  const base: GroupExpenseState = {
    groups: [
      scenarioHostOwed,
      scenarioGuestOwes,
      scenarioHostPartial,
      scenarioMixed,
      scenarioSettled,
    ],
    expenses,
    settlements,
    activityLog: [],
    pendingOps: [],
  };

  return { ...base, activityLog: rebuildActivityLogFromState(base) };
})();
