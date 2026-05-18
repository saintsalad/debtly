import { describe, expect, it } from 'vitest';

import { buildGroupSplitReceiptData } from '@/features/group-expense/groupReceiptData';
import type {
  GroupExpense,
  Settlement,
  SplitGroup,
} from '@/features/group-expense/types';

const fmt = (n: number) => `₱${n.toFixed(2)}`;

const joined = '2026-03-01T00:00:00.000Z';

function duoGroup(): SplitGroup {
  return {
    id: 'rg',
    name: 'Kitchen',
    inviteCode: 'K1',
    members: [
      { id: 'a', displayName: 'Ada', isCurrentUser: false, joinedAt: joined },
      { id: 'c', displayName: 'Cale', isCurrentUser: true, joinedAt: joined },
    ],
    createdAt: joined,
    updatedAt: joined,
    version: 1,
  };
}

function equalExpense(
  id: string,
  payer: string,
  amountMinor: number,
  included: string[]
): GroupExpense {
  return {
    id,
    groupId: 'rg',
    title: id,
    amountMinor,
    currency: 'PHP',
    paidByMemberId: payer,
    splitMethod: 'equal',
    includedMemberIds: included,
    shares: included.map((memberId) => ({ memberId })),
    expenseDate: '2026-03-02',
    createdAt: joined,
    updatedAt: joined,
    version: 1,
  };
}

describe('buildGroupSplitReceiptData', () => {
  it('shows total spend as slip Amount while balances are open', () => {
    const g = duoGroup();
    const expenses: GroupExpense[] = [
      equalExpense('din', 'c', 10000, ['c', 'a']),
    ];

    const data = buildGroupSplitReceiptData(g, expenses, [], fmt);
    expect(data.header.amount).toBe('₱100.00');
  });

  it('sets slip footer Amount to zero when ledger is fully square', () => {
    const g = duoGroup();
    const expenses: GroupExpense[] = [
      equalExpense('din', 'c', 10000, ['c', 'a']),
    ];
    const settlements: Settlement[] = [
      {
        id: 's1',
        groupId: 'rg',
        fromMemberId: 'a',
        toMemberId: 'c',
        amountMinor: 5000,
        settledAt: joined,
        version: 1,
      },
    ];

    const data = buildGroupSplitReceiptData(g, expenses, settlements, fmt);
    expect(data.header.amount).toBe('₱0.00');
    const totalRow = data.sections?.[0]?.rows.find((r) => r.label === 'Total spend');
    expect(totalRow?.value).toBe('₱100.00');
  });
});
