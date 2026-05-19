import { describe, expect, it } from 'vitest';

import { mergeConvexSplitSnapshot } from '@/features/group-expense/mergeConvexSplitSnapshot';
import type {
  ActivityLogEntry,
  GroupExpense,
  GroupExpenseState,
  Settlement,
  SplitGroup,
} from '@/features/group-expense/types';

const joinedAt = '2026-01-01T00:00:00.000Z';

function baseLocalGroup(id: string, inviteCode: string, syncMode?: SplitGroup['syncMode']): SplitGroup {
  return {
    id,
    name: 'Local',
    inviteCode,
    members: [
      {
        id: 'm1',
        displayName: 'You',
        isCurrentUser: true,
        joinedAt,
      },
    ],
    createdAt: joinedAt,
    updatedAt: joinedAt,
    version: 1,
    ...(syncMode ? { syncMode } : {}),
  };
}

describe('mergeConvexSplitSnapshot', () => {
  it('replaces convex-backed slice and preserves unrelated local groups', () => {
    const prev: GroupExpenseState = {
      groups: [
        baseLocalGroup('cloud_1', 'OLDLOCAL'),
        baseLocalGroup('local_only', 'LOCAL99'),
      ],
      expenses: [
        {
          id: 'e1',
          groupId: 'cloud_1',
          title: 'Old',
          amountMinor: 100,
          currency: 'USD',
          paidByMemberId: 'm1',
          splitMethod: 'equal',
          shares: [{ memberId: 'm1' }],
          includedMemberIds: ['m1'],
          expenseDate: '2026-01-02',
          createdAt: joinedAt,
          updatedAt: joinedAt,
          version: 1,
        },
        {
          id: 'e2',
          groupId: 'local_only',
          title: 'Keep',
          amountMinor: 200,
          currency: 'USD',
          paidByMemberId: 'm1',
          splitMethod: 'equal',
          shares: [{ memberId: 'm1' }],
          includedMemberIds: ['m1'],
          expenseDate: '2026-01-02',
          createdAt: joinedAt,
          updatedAt: joinedAt,
          version: 1,
        },
      ],
      settlements: [] as Settlement[],
      activityLog: [] as ActivityLogEntry[],
      pendingOps: [],
    };

    const cloudGroup: SplitGroup = {
      ...baseLocalGroup('cloud_1', 'SERVER'),
      name: 'Synced',
    };

    const cloudExpense: GroupExpense = {
      id: 'e_new',
      groupId: 'cloud_1',
      title: 'Server',
      amountMinor: 300,
      currency: 'USD',
      paidByMemberId: 'm9',
      splitMethod: 'equal',
      shares: [{ memberId: 'm9' }],
      includedMemberIds: ['m9'],
      expenseDate: '2026-01-03',
      createdAt: joinedAt,
      updatedAt: joinedAt,
      version: 2,
    };

    const merged = mergeConvexSplitSnapshot(prev, {
      groups: [cloudGroup],
      expenses: [cloudExpense],
      settlements: [],
      activityLog: [],
    });

    expect(merged.groups.find((g) => g.id === 'cloud_1')?.syncMode).toBe('convex');
    expect(merged.groups.find((g) => g.id === 'local_only')).toBeTruthy();
    expect(merged.expenses.some((e) => e.id === 'e1')).toBe(false);
    expect(merged.expenses.some((e) => e.id === 'e_new')).toBe(true);
    expect(merged.expenses.some((e) => e.groupId === 'local_only')).toBe(true);
  });

  it('drops legacy local rows that share an id with a convex group', () => {
    const prev: GroupExpenseState = {
      groups: [baseLocalGroup('same_id', 'LOCAL')],
      expenses: [],
      settlements: [],
      activityLog: [],
      pendingOps: [],
    };

    const merged = mergeConvexSplitSnapshot(prev, {
      groups: [baseLocalGroup('same_id', 'SERVER')],
      expenses: [],
      settlements: [],
      activityLog: [],
    });

    expect(merged.groups).toHaveLength(1);
    expect(merged.groups[0].syncMode).toBe('convex');
  });
});
