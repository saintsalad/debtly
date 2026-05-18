import { describe, expect, it } from 'vitest';
import type { GroupExpenseState } from '@/features/group-expense/types';
import { assembleGroupState, flattenGroupState } from '@/lib/db/mappers/group';

const sampleState: GroupExpenseState = {
  groups: [
    {
      id: 'g1',
      name: 'Trip',
      inviteCode: 'ABC123',
      members: [
        {
          id: 'm1',
          displayName: 'You',
          isCurrentUser: true,
          joinedAt: '2025-01-01T00:00:00.000Z',
        },
        {
          id: 'm2',
          displayName: 'Sam',
          isCurrentUser: false,
          joinedAt: '2025-01-01T00:00:00.000Z',
        },
      ],
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      version: 1,
    },
  ],
  expenses: [
    {
      id: 'e1',
      groupId: 'g1',
      title: 'Dinner',
      amountMinor: 30000,
      currency: 'PHP',
      paidByMemberId: 'm1',
      splitMethod: 'equal',
      shares: [],
      includedMemberIds: ['m1', 'm2'],
      expenseDate: '2025-01-02T00:00:00.000Z',
      createdAt: '2025-01-02T00:00:00.000Z',
      updatedAt: '2025-01-02T00:00:00.000Z',
      version: 1,
    },
  ],
  settlements: [],
  activityLog: [],
  pendingOps: [],
};

describe('group mapper', () => {
  it('round-trips group expense state', () => {
    const flat = flattenGroupState(sampleState);
    const restored = assembleGroupState(
      flat.groups,
      flat.members,
      flat.expenses,
      flat.settlements,
      flat.activity,
      flat.pendingOps
    );

    expect(restored.groups).toHaveLength(1);
    expect(restored.groups[0].members).toHaveLength(2);
    expect(restored.expenses[0].title).toBe('Dinner');
    expect(restored.expenses[0].includedMemberIds).toEqual(['m1', 'm2']);
  });
});
