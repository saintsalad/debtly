import { describe, expect, test } from 'vitest';

import type { Debt, DebtPayment } from '@/features/debts/types';
import {
  buildGroupExpenseInsights,
  buildTransactionInsights,
  collectActivityDayKeys,
  longestDailyStreak,
  longestWeeklyStreak,
  currentWeeklyStreak,
  monthlyEntryCountsCreatedInYear,
  countPaymentsInYear,
  totalPaidMinorInYear,
  formatCompactNumber,
  type GroupExpenseData,
} from '@/features/insights/transactionInsights';

function baseDebt(overrides: Partial<Debt> & Pick<Debt, 'id' | 'createdAt'>): Debt {
  return {
    id: overrides.id,
    personName: overrides.personName ?? 'Alex',
    principalMinor: 100_00,
    type: 'i_owe',
    status: 'pending',
    createdAt: overrides.createdAt,
    updatedAt: overrides.updatedAt ?? overrides.createdAt,
    payments: overrides.payments,
  };
}

describe('collectActivityDayKeys', () => {
  test('merges debt created dates and payment dates into unique local days', () => {
    const debts: Debt[] = [
      baseDebt({
        id: 'a',
        createdAt: new Date(2026, 0, 10, 9, 0, 0).toISOString(),
        payments: [
          {
            id: 'p1',
            amountMinor: 10,
            interestAppliedMinor: 0,
            principalAppliedMinor: 10,
            paidAt: new Date(2026, 0, 10, 18, 0, 0).toISOString(),
          } satisfies DebtPayment,
        ],
      }),
    ];
    const keys = collectActivityDayKeys(debts);
    expect(keys.size).toBe(1);
  });

  test('two separate days from createdAt and later payment', () => {
    const debts: Debt[] = [
      baseDebt({
        id: 'b',
        createdAt: new Date(2026, 0, 1).toISOString(),
        payments: [
          {
            id: 'p1',
            amountMinor: 10,
            interestAppliedMinor: 0,
            principalAppliedMinor: 10,
            paidAt: new Date(2026, 0, 3).toISOString(),
          } satisfies DebtPayment,
        ],
      }),
    ];
    const keys = collectActivityDayKeys(debts);
    expect(keys.size).toBe(2);
  });
});

describe('longestDailyStreak', () => {
  test('empty set is 0', () => {
    expect(longestDailyStreak(new Set())).toBe(0);
  });

  test('single day is 1', () => {
    expect(longestDailyStreak(new Set(['2026-01-01']))).toBe(1);
  });

  test('counts a three-day run', () => {
    const keys = new Set(['2026-01-01', '2026-01-02', '2026-01-03']);
    expect(longestDailyStreak(keys)).toBe(3);
  });

  test('breaks on gap', () => {
    const keys = new Set(['2026-01-01', '2026-01-02', '2026-01-05', '2026-01-06']);
    expect(longestDailyStreak(keys)).toBe(2);
  });
});

describe('longestWeeklyStreak', () => {
  test('empty is 0', () => {
    expect(longestWeeklyStreak(new Set())).toBe(0);
  });

  test('counts two consecutive ISO Monday weeks via activity Thu then next Wed', () => {
    // Thu Jan 15 2026 and Wed Jan 21 2026 are adjacent calendar weeks (Mon-based).
    const keys = collectActivityDayKeys([
      baseDebt({ id: '1', createdAt: new Date(2026, 0, 15).toISOString() }),
      baseDebt({ id: '2', createdAt: new Date(2026, 0, 21).toISOString() }),
    ]);
    expect(longestWeeklyStreak(keys)).toBeGreaterThanOrEqual(2);
  });
});

describe('currentWeeklyStreak', () => {
  test('0 when reference week has no activity', () => {
    const asOf = new Date(2026, 2, 1);
    expect(currentWeeklyStreak(new Set(['2026-01-05']), asOf)).toBe(0);
  });

  test('2 when activity during reference week and the prior calendar week', () => {
    const asOfMonday = new Date(2026, 0, 19);
    const keys = new Set(['2026-01-20', '2026-01-13']);
    expect(currentWeeklyStreak(keys, asOfMonday)).toBe(2);
  });
});

describe('monthlyEntryCountsCreatedInYear', () => {
  test('buckets entries by creation month local year', () => {
    const debts: Debt[] = [
      baseDebt({ id: 'a', createdAt: new Date(2026, 0, 5).toISOString() }),
      baseDebt({ id: 'b', createdAt: new Date(2026, 1, 1).toISOString() }),
      baseDebt({ id: 'c', createdAt: new Date(2025, 11, 31).toISOString() }),
    ];
    const counts = monthlyEntryCountsCreatedInYear(debts, 2026);
    expect(counts[0]).toBe(1);
    expect(counts[1]).toBe(1);
    expect(counts.reduce((s, v) => s + v, 0)).toBe(2);
  });
});

describe('countPaymentsInYear', () => {
  test('counts payment rows in target year only', () => {
    const debts: Debt[] = [
      baseDebt({
        id: 'a',
        createdAt: new Date(2026, 0, 1).toISOString(),
        payments: [
          {
            id: 'p1',
            amountMinor: 1,
            interestAppliedMinor: 0,
            principalAppliedMinor: 1,
            paidAt: new Date(2026, 5, 1).toISOString(),
          } satisfies DebtPayment,
          {
            id: 'p2',
            amountMinor: 1,
            interestAppliedMinor: 0,
            principalAppliedMinor: 1,
            paidAt: new Date(2025, 11, 31).toISOString(),
          } satisfies DebtPayment,
        ],
      }),
    ];
    expect(countPaymentsInYear(debts, 2026)).toBe(1);
  });
});

describe('totalPaidMinorInYear', () => {
  test('sums payment amounts in target year only', () => {
    const debts: Debt[] = [
      baseDebt({
        id: 'a',
        createdAt: new Date(2026, 0, 1).toISOString(),
        payments: [
          {
            id: 'p1',
            amountMinor: 5000,
            interestAppliedMinor: 0,
            principalAppliedMinor: 5000,
            paidAt: new Date(2026, 5, 1).toISOString(),
          } satisfies DebtPayment,
          {
            id: 'p2',
            amountMinor: 3000,
            interestAppliedMinor: 0,
            principalAppliedMinor: 3000,
            paidAt: new Date(2026, 6, 15).toISOString(),
          } satisfies DebtPayment,
          {
            id: 'p3',
            amountMinor: 10000,
            interestAppliedMinor: 0,
            principalAppliedMinor: 10000,
            paidAt: new Date(2025, 11, 31).toISOString(),
          } satisfies DebtPayment,
        ],
      }),
    ];
    expect(totalPaidMinorInYear(debts, 2026)).toBe(8000);
  });

  test('returns 0 when no payments in year', () => {
    const debts: Debt[] = [
      baseDebt({ id: 'a', createdAt: new Date(2026, 0, 1).toISOString() }),
    ];
    expect(totalPaidMinorInYear(debts, 2026)).toBe(0);
  });
});

describe('formatCompactNumber', () => {
  test('returns value as-is below 1000', () => {
    expect(formatCompactNumber(0)).toBe('0');
    expect(formatCompactNumber(999)).toBe('999');
  });

  test('formats thousands with k suffix', () => {
    expect(formatCompactNumber(1000)).toBe('1k');
    expect(formatCompactNumber(1500)).toBe('1.5k');
    expect(formatCompactNumber(1550)).toBe('1.5k+');
    expect(formatCompactNumber(60000)).toBe('60k');
    expect(formatCompactNumber(60500)).toBe('60.5k');
    expect(formatCompactNumber(60550)).toBe('60.5k+');
    expect(formatCompactNumber(999999)).toBe('999.9k+');
  });

  test('formats millions with M suffix', () => {
    expect(formatCompactNumber(1_000_000)).toBe('1M');
    expect(formatCompactNumber(1_500_000)).toBe('1.5M');
    expect(formatCompactNumber(1_550_000)).toBe('1.5M+');
    expect(formatCompactNumber(2_345_678)).toBe('2.3M+');
  });
});

describe('buildTransactionInsights', () => {
  test('aggregates snapshot for fixed now', () => {
    const now = new Date(2026, 5, 15);
    const debts: Debt[] = [
      baseDebt({ id: 'a', createdAt: new Date(2026, 2, 1).toISOString() }),
      baseDebt({ id: 'b', createdAt: new Date(2026, 2, 2).toISOString() }),
    ];
    const ins = buildTransactionInsights(debts, { now });
    expect(ins.calendarYear).toBe(2026);
    expect(ins.entriesThisYear).toBe(2);
    expect(ins.monthlyEntryCounts[2]).toBe(2);
    expect(ins.longestDailyStreak).toBe(2);
  });

  test('includes totalPaidMinorThisYear', () => {
    const now = new Date(2026, 5, 15);
    const debts: Debt[] = [
      baseDebt({
        id: 'a',
        createdAt: new Date(2026, 2, 1).toISOString(),
        payments: [
          {
            id: 'p1',
            amountMinor: 25000,
            interestAppliedMinor: 0,
            principalAppliedMinor: 25000,
            paidAt: new Date(2026, 3, 1).toISOString(),
          } satisfies DebtPayment,
        ],
      }),
    ];
    const ins = buildTransactionInsights(debts, { now });
    expect(ins.totalPaidMinorThisYear).toBe(25000);
  });
});

describe('buildGroupExpenseInsights', () => {
  test('counts groups and expenses this year', () => {
    const now = new Date(2026, 5, 15);
    const data: GroupExpenseData = {
      groups: [
        { id: 'g1', createdAt: new Date(2026, 1, 1).toISOString() },
        { id: 'g2', createdAt: new Date(2025, 11, 1).toISOString() },
      ],
      expenses: [
        { id: 'e1', amountMinor: 10000, expenseDate: new Date(2026, 2, 1).toISOString() },
        { id: 'e2', amountMinor: 5000, expenseDate: new Date(2026, 3, 1).toISOString() },
        { id: 'e3', amountMinor: 20000, expenseDate: new Date(2025, 11, 1).toISOString() },
      ],
      settlements: [
        { id: 's1', amountMinor: 3000, settledAt: new Date(2026, 4, 1).toISOString() },
      ],
    };
    const ins = buildGroupExpenseInsights(data, { now });
    expect(ins.calendarYear).toBe(2026);
    expect(ins.totalGroups).toBe(2);
    expect(ins.groupsCreatedThisYear).toBe(1);
    expect(ins.expensesThisYear).toBe(2);
    expect(ins.totalSpentMinorThisYear).toBe(15000);
    expect(ins.settlementsThisYear).toBe(1);
    expect(ins.totalSettledMinorThisYear).toBe(3000);
  });

  test('excludes deleted expenses', () => {
    const now = new Date(2026, 5, 15);
    const data: GroupExpenseData = {
      groups: [{ id: 'g1', createdAt: new Date(2026, 1, 1).toISOString() }],
      expenses: [
        { id: 'e1', amountMinor: 10000, expenseDate: new Date(2026, 2, 1).toISOString() },
        {
          id: 'e2',
          amountMinor: 5000,
          expenseDate: new Date(2026, 3, 1).toISOString(),
          deletedAt: new Date(2026, 3, 2).toISOString(),
        },
      ],
      settlements: [],
    };
    const ins = buildGroupExpenseInsights(data, { now });
    expect(ins.expensesThisYear).toBe(1);
    expect(ins.totalSpentMinorThisYear).toBe(10000);
  });

  test('returns zeros for empty data', () => {
    const now = new Date(2026, 5, 15);
    const data: GroupExpenseData = { groups: [], expenses: [], settlements: [] };
    const ins = buildGroupExpenseInsights(data, { now });
    expect(ins.totalGroups).toBe(0);
    expect(ins.expensesThisYear).toBe(0);
    expect(ins.totalSpentMinorThisYear).toBe(0);
  });
});
