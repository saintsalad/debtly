import { describe, expect, it } from 'vitest';

import { buildGroupSplitReceiptData } from '@/features/group-expense/groupReceiptData';
import type {
  GroupExpense,
  Settlement,
  SplitGroup,
} from '@/features/group-expense/types';

const fmt = (n: number) => `₱${n.toFixed(2)}`;

const joined = '2026-03-01T00:00:00.000Z';

function quartetGroup(): SplitGroup {
  return {
    id: 'rg',
    name: 'Trip',
    inviteCode: 'K1',
    members: [
      { id: 'ada', displayName: 'Ada', isCurrentUser: false, joinedAt: joined },
      { id: 'arn', displayName: 'Arnold', isCurrentUser: false, joinedAt: joined },
      { id: 'cale', displayName: 'Cale', isCurrentUser: true, joinedAt: joined },
      { id: 'riley', displayName: 'Riley', isCurrentUser: false, joinedAt: joined },
    ],
    createdAt: joined,
    updatedAt: joined,
    version: 1,
  };
}

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
  included: string[],
  title?: string,
  expenseDate?: string
): GroupExpense {
  return {
    id,
    groupId: 'rg',
    title: title ?? id,
    amountMinor,
    currency: 'PHP',
    paidByMemberId: payer,
    splitMethod: 'equal',
    includedMemberIds: included,
    shares: included.map((memberId) => ({ memberId })),
    expenseDate: expenseDate ?? '2026-03-02',
    createdAt: joined,
    updatedAt: joined,
    version: 1,
  };
}

describe('buildGroupSplitReceiptData', () => {
  it('lists each expense with Paid / share amount / Excluded (Arnold pays, Cale skipped)', () => {
    const g = quartetGroup();
    /** Arnold fronts ₱120, split evenly among Riley, Ada, Arnold — Cale not on bill */
    const expenses: GroupExpense[] = [
      equalExpense(
        'e-lunch',
        'arn',
        12_000,
        ['ada', 'riley', 'arn'],
        'Team lunch',
        '2026-03-03'
      ),
    ];

    const data = buildGroupSplitReceiptData(g, expenses, [], fmt);

    expect(data.header.amount).toBe('₱120.00');
    expect(data.sections?.map((s) => s.title)).toEqual(['SUMMARY', 'EXPENSES']);

    expect(data.omitFooterAmountRow).toBe(true);

    const block = data.sections?.find((s) => s.title === 'EXPENSES')?.rows ?? [];

    expect(block[0].label).toBe('Team lunch');
    expect(block[0].value).toBe('₱120.00');

    expect(block.find((r) => r.label === 'Members')).toMatchObject({
      label: 'Members',
      value: '',
    });

    const ada = block.find((r) => r.label.trim() === 'Ada');
    const riley = block.find((r) => r.label.trim() === 'Riley');
    const arn = block.find((r) => r.label.trim() === 'Arnold ★');
    const cale = block.find((r) => r.label.trim() === 'Cale');

    expect(ada?.value).toBe('₱40.00');
    expect(riley?.value).toBe('₱40.00');
    expect(arn?.value).toBe('Paid');
    expect(cale?.value).toBe('Excluded');
  });

  it('shows Riley Paid and Arnold Excluded when only two people split', () => {
    const g = quartetGroup();
    const expenses: GroupExpense[] = [
      equalExpense('e-a', 'riley', 10_000, ['ada', 'riley'], 'Dinner A', '2026-03-02'),
    ];

    const block =
      buildGroupSplitReceiptData(g, expenses, [], fmt).sections?.find((s) => s.title === 'EXPENSES')
        ?.rows ?? [];

    const riley = block.find((r) => r.label.trim() === 'Riley ★');
    const ada = block.find((r) => r.label.trim() === 'Ada');
    const arn = block.find((r) => r.label.trim() === 'Arnold');

    expect(riley?.value).toBe('Paid');
    expect(ada?.value).toBe('₱50.00');
    expect(arn?.value).toBe('Excluded');
  });

  it('merges expenses when the same person paid and the same people were included', () => {
    const g = quartetGroup();
    const expenses: GroupExpense[] = [
      equalExpense('e-new', 'riley', 10_000, ['ada', 'riley'], 'Dinner A', '2026-03-04'),
      equalExpense('e-old', 'riley', 10_000, ['ada', 'riley'], 'Dinner B', '2026-03-03'),
    ];

    const block =
      buildGroupSplitReceiptData(g, expenses, [], fmt).sections?.find((s) => s.title === 'EXPENSES')
        ?.rows ?? [];

    /** Newest-first: each bill on its own line, shared Members + totaled shares */
    expect(block.slice(0, 2)).toEqual([
      { label: 'Dinner A', value: '₱100.00' },
      { label: 'Dinner B', value: '₱100.00' },
    ]);
    expect(block.find((r) => r.label === 'Members')).toMatchObject({ value: '' });
    expect(block.find((r) => r.label.trim() === 'Riley ★')?.value).toBe('Paid');
    expect(block.find((r) => r.label.trim() === 'Ada')?.value).toBe('₱100.00');
    /** Only one EXPENSE-style block — no spacer before a second duplicate block */
    expect(block.filter((r) => r.label === 'Members').length).toBe(1);
  });

  it('does not merge when inclusion differs even if payer is the same', () => {
    const g = quartetGroup();
    const expenses: GroupExpense[] = [
      equalExpense('e1', 'riley', 10_000, ['ada', 'riley'], 'Duo bill', '2026-03-04'),
      equalExpense(
        'e2',
        'riley',
        12_000,
        ['ada', 'riley', 'arn'],
        'Tripod bill',
        '2026-03-03'
      ),
    ];

    const block =
      buildGroupSplitReceiptData(g, expenses, [], fmt).sections?.find((s) => s.title === 'EXPENSES')
        ?.rows ?? [];

    expect(block.find((r) => r.label === 'Duo bill')).toMatchObject({
      label: 'Duo bill',
      value: '₱100.00',
    });
    expect(block.find((r) => r.label === 'Tripod bill')).toMatchObject({
      label: 'Tripod bill',
      value: '₱120.00',
    });
    expect(block.filter((r) => r.label === 'Members').length).toBe(2);
  });

  it('uses viewer profile label when stored member name is still “You”', () => {
    const g = duoGroup();
    const youLabelGroup: SplitGroup = {
      ...g,
      members: g.members.map((m) =>
        m.isCurrentUser ? { ...m, displayName: 'You' } : m
      ),
    };
    const expenses: GroupExpense[] = [
      equalExpense('din', 'c', 10_000, ['c', 'a'], 'Dinner', '2026-03-02'),
    ];

    const block =
      buildGroupSplitReceiptData(youLabelGroup, expenses, [], fmt, new Date(joined), 'Cale').sections?.find(
        (s) => s.title === 'EXPENSES'
      )?.rows ?? [];

    const cale = block.find((r) => r.label.trim() === 'Cale ★');
    expect(cale?.value).toBe('Paid');
    expect(block.find((r) => r.label.trim() === 'Ada')?.value).toBe('₱50.00');
  });

  it('shows slip Amount zero only when ledger is square', () => {
    const g = duoGroup();
    const expenses: GroupExpense[] = [
      equalExpense('din', 'c', 10_000, ['c', 'a'], 'Dinner'),
    ];

    expect(buildGroupSplitReceiptData(g, expenses, [], fmt).header.amount).toBe('₱100.00');

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

    expect(buildGroupSplitReceiptData(g, expenses, settlements, fmt).header.amount).toBe('₱0.00');

    const data = buildGroupSplitReceiptData(g, expenses, settlements, fmt);
    expect(data.sections?.map((s) => s.title)).toEqual(['SUMMARY', 'EXPENSES']);
    expect(data.sections?.[0]?.rows.map((r) => r.label)).toEqual([
      'Members',
      'Bills',
      'Total spend',
    ]);
    expect(data.sections?.[0]?.rows.find((r) => r.label === 'Total spend')?.value).toBe('₱100.00');

    const expRows = data.sections?.find((s) => s.title === 'EXPENSES')?.rows ?? [];
    expect(expRows.find((r) => r.label.trim() === 'Ada')?.value).toBe('Paid');
  });

  it('shows remainder on member row after partial settlement', () => {
    const g = duoGroup();
    const expenses: GroupExpense[] = [
      equalExpense('din', 'c', 10_000, ['c', 'a'], 'Dinner', '2026-03-02'),
    ];

    const settlements: Settlement[] = [
      {
        id: 's1',
        groupId: 'rg',
        fromMemberId: 'a',
        toMemberId: 'c',
        amountMinor: 2500,
        settledAt: joined,
        version: 1,
      },
    ];

    const expRows =
      buildGroupSplitReceiptData(g, expenses, settlements, fmt).sections?.find(
        (s) => s.title === 'EXPENSES'
      )?.rows ?? [];

    expect(expRows.find((r) => r.label.trim() === 'Ada')?.value).toBe('₱25.00');
  });
});
