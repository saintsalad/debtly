import { describe, expect, it } from 'vitest';

import {
  allocateEqualShares,
  buildGroupEdges,
  computeExpenseShares,
  createDefaultShares,
  netBetween,
  validateExpenseShares,
} from './balanceEngine';
import { AMOUNT_EXCEEDS_MAX_MESSAGE, MAX_INPUT_AMOUNT_MINOR } from '@/features/debts/money';
import type { ExpenseShare, GroupExpense } from './types';

const a = 'member-a';
const b = 'member-b';
const c = 'member-c';

function adjustmentShares(rows: { memberId: string; adjustmentMinor: number }[]): ExpenseShare[] {
  return rows.map((r) => ({ memberId: r.memberId, adjustmentMinor: r.adjustmentMinor }));
}

function adjustmentExpense(opts: {
  amountMinor: number;
  included: string[];
  paidBy?: string;
  shares: ExpenseShare[];
  id?: string;
}): GroupExpense {
  const { amountMinor, included, shares, paidBy, id } = opts;
  return {
    id: id ?? 'e1',
    groupId: 'g1',
    title: 'Test',
    amountMinor,
    currency: 'USD',
    expenseDate: '2026-01-01',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    version: 1,
    paidByMemberId: paidBy ?? included[0] ?? a,
    splitMethod: 'adjustment',
    includedMemberIds: included,
    shares,
  };
}

describe('adjustment split · validateExpenseShares', () => {
  it('rejects zero participants', () => {
    expect(validateExpenseShares(10000, 'adjustment', [], [])).toBe('Select at least one participant.');
  });

  it('rejects non-positive total', () => {
    expect(validateExpenseShares(0, 'adjustment', [a, b], adjustmentShares([
      { memberId: a, adjustmentMinor: 0 },
      { memberId: b, adjustmentMinor: 0 },
    ]))).toBe('Enter an amount greater than 0.');
    expect(
      validateExpenseShares(-100, 'adjustment', [a, b], adjustmentShares([
        { memberId: a, adjustmentMinor: 0 },
        { memberId: b, adjustmentMinor: 0 },
      ])),
    ).toBe('Enter an amount greater than 0.');
  });

  it('allows zero adjustments (equal split)', () => {
    expect(
      validateExpenseShares(10000, 'adjustment', [a, b], adjustmentShares([
        { memberId: a, adjustmentMinor: 0 },
        { memberId: b, adjustmentMinor: 0 },
      ])),
    ).toBeNull();
  });

  it('allows balanced +/- adjustments that stay non-negative', () => {
    const base = allocateEqualShares(10000, [a, b]);
    expect(base.get(a)).toBe(5000);
    expect(base.get(b)).toBe(5000);
    expect(
      validateExpenseShares(10000, 'adjustment', [a, b], adjustmentShares([
        { memberId: a, adjustmentMinor: 2000 },
        { memberId: b, adjustmentMinor: -2000 },
      ])),
    ).toBeNull();
  });

  it('rejects adjustments that do not sum to zero', () => {
    expect(
      validateExpenseShares(10000, 'adjustment', [a, b], adjustmentShares([
        { memberId: a, adjustmentMinor: 500 },
        { memberId: b, adjustmentMinor: 0 },
      ])),
    ).toBe('Adjustments must balance to zero (the sum of +/- amounts must be 0).');

    expect(
      validateExpenseShares(10000, 'adjustment', [a, b, c], adjustmentShares([
        { memberId: a, adjustmentMinor: 100 },
        { memberId: b, adjustmentMinor: 50 },
        { memberId: c, adjustmentMinor: -100 },
      ])),
    ).toBe('Adjustments must balance to zero (the sum of +/- amounts must be 0).');
  });

  it('rejects any final allocated share below zero', () => {
    expect(
      validateExpenseShares(10000, 'adjustment', [a, b], adjustmentShares([
        { memberId: a, adjustmentMinor: -6000 },
        { memberId: b, adjustmentMinor: 6000 },
      ])),
    ).toBe('Adjustments would make someone owe less than zero.');
  });

  it('rejects negatives at remainder boundaries (three-way equal base)', () => {
    const base = allocateEqualShares(10000, [a, b, c]);
    expect(Array.from(base.values()).reduce((s, x) => s + x, 0)).toBe(10000);
    expect(
      validateExpenseShares(10000, 'adjustment', [a, b, c], adjustmentShares([
        { memberId: a, adjustmentMinor: -3400 },
        { memberId: b, adjustmentMinor: 1700 },
        { memberId: c, adjustmentMinor: 1700 },
      ])),
    ).toBe('Adjustments would make someone owe less than zero.');
  });

  it('allows three-way tweaks that respect remainder-based equal shares', () => {
    const base = allocateEqualShares(10000, [a, b, c]);
    expect([base.get(a), base.get(b), base.get(c)]).toEqual([3334, 3333, 3333]);

    expect(
      validateExpenseShares(10000, 'adjustment', [a, b, c], adjustmentShares([
        { memberId: a, adjustmentMinor: -100 },
        { memberId: b, adjustmentMinor: 50 },
        { memberId: c, adjustmentMinor: 50 },
      ])),
    ).toBeNull();
  });

  it('treats missing share rows as zero adjustment per included member', () => {
    expect(validateExpenseShares(10000, 'adjustment', [a, b], [])).toBeNull();

    expect(
      validateExpenseShares(10000, 'adjustment', [a, b], [{ memberId: a, adjustmentMinor: 1000 }]),
    ).toBe('Adjustments must balance to zero (the sum of +/- amounts must be 0).');

    expect(
      validateExpenseShares(10000, 'adjustment', [a, b], adjustmentShares([
        { memberId: a, adjustmentMinor: 600 },
        { memberId: b, adjustmentMinor: -600 },
      ])),
    ).toBeNull();

    expect(
      validateExpenseShares(10000, 'adjustment', [a, b], [
        { memberId: a, adjustmentMinor: 1000 },
        { memberId: b },
      ]),
    ).toBe('Adjustments must balance to zero (the sum of +/- amounts must be 0).');
    expect(
      validateExpenseShares(10000, 'adjustment', [a, b], [
        { memberId: a, adjustmentMinor: 250 },
        { memberId: b, adjustmentMinor: -250 },
      ]),
    ).toBeNull();
  });

  it('only includes adjustments for included members when validating sum and finals', () => {
    expect(
      validateExpenseShares(
        5000,
        'adjustment',
        [b, c],
        adjustmentShares([
          { memberId: a, adjustmentMinor: -3000 },
          { memberId: b, adjustmentMinor: 2500 },
          { memberId: c, adjustmentMinor: -2500 },
        ]),
      ),
    ).toBeNull();

    expect(
      validateExpenseShares(
        5000,
        'adjustment',
        [a, b],
        adjustmentShares([
          { memberId: a, adjustmentMinor: 2500 },
          { memberId: b, adjustmentMinor: 2500 },
          { memberId: c, adjustmentMinor: -5000 },
        ]),
      ),
    ).toBe('Adjustments must balance to zero (the sum of +/- amounts must be 0).');
  });
});

describe('adjustment split · computeExpenseShares', () => {
  it('matches equal shares when adjustments are zero', () => {
    const expense = adjustmentExpense({
      amountMinor: 9900,
      included: [a, b],
      shares: adjustmentShares([
        { memberId: a, adjustmentMinor: 0 },
        { memberId: b, adjustmentMinor: 0 },
      ]),
    });
    expect(computeExpenseShares(expense)).toEqual(new Map([
      [a, 4950],
      [b, 4950],
    ]));
  });

  it('applies deltas on top of equal shares and preserves total', () => {
    const expense = adjustmentExpense({
      amountMinor: 10000,
      included: [a, b],
      shares: adjustmentShares([
        { memberId: a, adjustmentMinor: 125 },
        { memberId: b, adjustmentMinor: -125 },
      ]),
    });
    const map = computeExpenseShares(expense);
    expect(map.get(a)).toBe(5125);
    expect(map.get(b)).toBe(4875);
    expect(Array.from(map.values()).reduce((s, x) => s + x, 0)).toBe(10000);
  });

  it('uses allocation remainder first members when applying adjustments across three people', () => {
    const expense = adjustmentExpense({
      amountMinor: 100,
      included: [a, b, c],
      shares: adjustmentShares([
        { memberId: a, adjustmentMinor: 10 },
        { memberId: b, adjustmentMinor: -5 },
        { memberId: c, adjustmentMinor: -5 },
      ]),
    });
    const map = computeExpenseShares(expense);
    expect(map.get(a)).toBe(44);
    expect(map.get(b)).toBe(28);
    expect(map.get(c)).toBe(28);
    expect(Array.from(map.values()).reduce((s, x) => s + x, 0)).toBe(100);
  });

  it('defaults missing adjustmentMinor to zero for a row', () => {
    const expense = adjustmentExpense({
      amountMinor: 100,
      included: [a, b],
      shares: [{ memberId: a, adjustmentMinor: -10 }, { memberId: b }],
    });
    const map = computeExpenseShares(expense);
    expect(map.get(a)).toBe(40);
    expect(map.get(b)).toBe(50);
  });
});

describe('adjustment split · createDefaultShares', () => {
  it('zeros adjustments for everyone included', () => {
    expect(createDefaultShares('adjustment', [a, b, c], 12345)).toEqual([
      { memberId: a, adjustmentMinor: 0 },
      { memberId: b, adjustmentMinor: 0 },
      { memberId: c, adjustmentMinor: 0 },
    ]);
  });
});

describe('adjustment split · balances from edges', () => {
  it('attributes non-payer splits as owed toward the payer (two people)', () => {
    const expense = adjustmentExpense({
      amountMinor: 10000,
      included: [a, b],
      paidBy: a,
      shares: adjustmentShares([
        { memberId: a, adjustmentMinor: -1000 },
        { memberId: b, adjustmentMinor: 1000 },
      ]),
    });
    expense.groupId = 'g-split';
    const edges = buildGroupEdges([expense], [], 'g-split');
    expect(Array.from(edges.entries()).length).toBe(1);
    expect(netBetween(edges, b, a)).toBe(-6000);
  });

  it('distributes payer share across multiple debtors after adjustment', () => {
    const expense = adjustmentExpense({
      amountMinor: 300,
      included: [a, b, c],
      paidBy: c,
      shares: adjustmentShares([
        { memberId: a, adjustmentMinor: 30 },
        { memberId: b, adjustmentMinor: -15 },
        { memberId: c, adjustmentMinor: -15 },
      ]),
    });
    expense.groupId = 'g-split';
    const edges = buildGroupEdges([expense], [], 'g-split');
    const sharesMap = computeExpenseShares(expense);
    const shareA = sharesMap.get(a) ?? 0;
    const shareB = sharesMap.get(b) ?? 0;
    const shareC = sharesMap.get(c) ?? 0;
    expect(shareA + shareB + shareC).toBe(300);
    expect(netBetween(edges, a, c)).toBe(-shareA);
    expect(netBetween(edges, b, c)).toBe(-shareB);
    expect(netBetween(edges, c, a)).toBe(shareA);
  });
});

describe('validateExpenseShares · expense amount ceiling', () => {
  it('rejects totals above ceiling', () => {
    expect(validateExpenseShares(MAX_INPUT_AMOUNT_MINOR + 1, 'equal', [a], [])).toBe(
      AMOUNT_EXCEEDS_MAX_MESSAGE
    );
  });

  it('rejects non-finite amountMinor totals', () => {
    expect(validateExpenseShares(Number.POSITIVE_INFINITY, 'equal', [a], [])).toBe(
      'Enter an amount greater than 0.'
    );
  });
});
