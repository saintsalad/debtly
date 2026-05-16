/**
 * Real-world scenario test suite for debt tracking.
 *
 * Tests are grouped into:
 *   - SUPPORTED scenarios   → assertions verify current correct behaviour
 *   - UNSUPPORTED scenarios → assertions are marked with TODO comments and
 *     document the *current* (limited) behaviour so gaps are visible.
 *     These act as a specification for future features.
 */
import { describe, expect, it } from 'vitest';

import { advanceRecurringDueDate } from '@/features/debts/dates';
import { createDebtFromInput } from '@/features/debts/debtCalculations';
import { projectDebtLedger } from '@/features/debts/debtLedger';
import { buildInterestFields, validateAddDebtInput } from '@/features/debts/interestEngine';
import {
  buildNextRecurringCycle,
  canGenerateNextRecurringCycle,
  hasOpenRecurringCycle,
} from '@/features/debts/recurringEngine';
import type { AddDebtInput, Debt, DebtPayment } from '@/features/debts/types';

// ─── Test helpers ────────────────────────────────────────────────────────────

function payment(
  id: string,
  amountMinor: number,
  paidAt: string,
  interestAppliedMinor = 0
): DebtPayment {
  return {
    id,
    amountMinor,
    interestAppliedMinor,
    principalAppliedMinor: amountMinor - interestAppliedMinor,
    paidAt,
  };
}

function makeDebt(overrides: Partial<Debt> = {}): Debt {
  return {
    id: 'debt-1',
    personName: 'Alice',
    principalMinor: 10_000, // ₱100.00
    type: 'owed_to_me',
    status: 'pending',
    payments: [],
    interestPaidMinor: 0,
    principalPaidMinor: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeInput(overrides: Partial<AddDebtInput> = {}): AddDebtInput {
  return {
    personName: 'Alice',
    amount: 100,
    type: 'owed_to_me',
    ...overrides,
  };
}

const paidRecurringDebt = (overrides: Partial<Debt> = {}): Debt => ({
  ...makeDebt({
    status: 'paid',
    paidAt: '2026-02-01T00:00:00.000Z',
    isRecurring: true,
    recurrenceInterval: 'monthly',
    dueDate: '2026-01-31',
    recurrenceAnchorDate: '2026-01-31',
    recurringGroupId: 'group-1',
    recurringSourceId: 'group-1',
  }),
  ...overrides,
});

// ─── 1. INPUT VALIDATION ─────────────────────────────────────────────────────

describe('[validation] basic debt entry', () => {
  // SUPPORTED
  it('accepts a valid "they owe me" entry', () => {
    expect(validateAddDebtInput(makeInput())).toBeNull();
  });

  it('accepts a valid "I owe" entry', () => {
    expect(validateAddDebtInput(makeInput({ type: 'i_owe' }))).toBeNull();
  });

  it('accepts an entry with a due date', () => {
    expect(validateAddDebtInput(makeInput({ dueDate: '2026-03-01' }))).toBeNull();
  });

  it('accepts an entry with an optional note', () => {
    expect(validateAddDebtInput(makeInput({ note: 'dinner at the mall' }))).toBeNull();
  });

  it('rejects empty person name', () => {
    expect(validateAddDebtInput(makeInput({ personName: '' }))).not.toBeNull();
  });

  it('rejects whitespace-only person name', () => {
    expect(validateAddDebtInput(makeInput({ personName: '   ' }))).not.toBeNull();
  });

  it('rejects zero amount', () => {
    expect(validateAddDebtInput(makeInput({ amount: 0 }))).not.toBeNull();
  });

  it('rejects negative amount', () => {
    expect(validateAddDebtInput(makeInput({ amount: -50 }))).not.toBeNull();
  });
});

describe('[validation] interest settings', () => {
  // SUPPORTED
  it('accepts valid interest rate (12% APR)', () => {
    expect(validateAddDebtInput(makeInput({ interestRateBps: 1200 }))).toBeNull();
  });

  it('accepts interest rate at maximum (100% APR = 10000 bps)', () => {
    expect(validateAddDebtInput(makeInput({ interestRateBps: 10_000 }))).toBeNull();
  });

  it('rejects interest rate above 100% APR', () => {
    expect(validateAddDebtInput(makeInput({ interestRateBps: 10_001 }))).not.toBeNull();
  });

  it('rejects interest-after-due when no due date is set', () => {
    expect(
      validateAddDebtInput(makeInput({ interestRateBps: 500, interestStartMode: 'after_due' }))
    ).not.toBeNull();
  });

  it('accepts interest-after-due when due date is set', () => {
    expect(
      validateAddDebtInput(
        makeInput({ interestRateBps: 500, interestStartMode: 'after_due', dueDate: '2026-03-01' })
      )
    ).toBeNull();
  });
});

describe('[validation] recurring settings', () => {
  // SUPPORTED
  it('accepts a valid recurring entry (monthly)', () => {
    expect(
      validateAddDebtInput(
        makeInput({ isRecurring: true, recurrenceInterval: 'monthly', dueDate: '2026-02-01' })
      )
    ).toBeNull();
  });

  it('accepts a valid recurring entry (weekly)', () => {
    expect(
      validateAddDebtInput(
        makeInput({ isRecurring: true, recurrenceInterval: 'weekly', dueDate: '2026-01-08' })
      )
    ).toBeNull();
  });

  it('rejects recurring debt without a due date', () => {
    expect(
      validateAddDebtInput(makeInput({ isRecurring: true, recurrenceInterval: 'monthly' }))
    ).not.toBeNull();
  });

  it('rejects recurring debt without a recurrence interval', () => {
    expect(
      validateAddDebtInput(makeInput({ isRecurring: true, dueDate: '2026-02-01' }))
    ).not.toBeNull();
  });
});

// ─── 2. THEY OWE ME — supported scenarios ────────────────────────────────────

describe('[owed_to_me] friend borrowed cash for lunch', () => {
  it('creates debt correctly', () => {
    const debt = createDebtFromInput(makeInput({ amount: 150, note: 'lunch' }), '2026-01-01T00:00:00.000Z');
    expect(debt.principalMinor).toBe(15_000);
    expect(debt.type).toBe('owed_to_me');
    expect(debt.note).toBe('lunch');
    expect(debt.status).toBe('pending');
  });

  it('still fully outstanding before payment', () => {
    const debt = makeDebt({ principalMinor: 15_000 });
    expect(projectDebtLedger(debt).remainingMinor).toBe(15_000);
  });

  it('settled after full payment', () => {
    const debt = makeDebt({
      principalMinor: 15_000,
      payments: [payment('p1', 15_000, '2026-01-02T00:00:00.000Z')],
    });
    expect(projectDebtLedger(debt).isSettled).toBe(true);
  });
});

describe('[owed_to_me] covered housemate monthly rent share', () => {
  const rentDebt = makeDebt({ principalMinor: 500_000 }); // ₱5,000

  it('₱5,000 rent covered — full amount outstanding', () => {
    expect(projectDebtLedger(rentDebt).remainingMinor).toBe(500_000);
  });

  it('housemate pays half — ₱2,500 remaining', () => {
    const debt = makeDebt({
      principalMinor: 500_000,
      payments: [payment('p1', 250_000, '2026-01-10T00:00:00.000Z')],
    });
    expect(projectDebtLedger(debt).remainingMinor).toBe(250_000);
  });
});

describe('[owed_to_me] sold phone on credit', () => {
  it('creates ₱8,000 credit sale entry', () => {
    const debt = createDebtFromInput(
      makeInput({ personName: 'Buyer', amount: 8000, type: 'owed_to_me', note: 'Samsung A55' }),
      '2026-01-01T00:00:00.000Z'
    );
    expect(debt.principalMinor).toBe(800_000);
    expect(debt.status).toBe('pending');
  });
});

describe('[owed_to_me] monthly subscription split (recurring)', () => {
  it('cycle 1 settles → cycle 2 spawns with next due date', () => {
    const cycle1 = paidRecurringDebt({ principalMinor: 25_000, dueDate: '2026-01-31', recurrenceAnchorDate: '2026-01-31' });
    const cycle2 = buildNextRecurringCycle(cycle1, '2026-02-01T00:00:00.000Z');
    expect(cycle2).not.toBeNull();
    expect(cycle2!.dueDate).toBe('2026-02-28'); // Jan 31 anchor clamped to Feb 28
    expect(cycle2!.principalMinor).toBe(25_000);
    expect(cycle2!.status).toBe('pending');
  });

  it('cycle 2 settles → cycle 3 restores anchor day when month is long enough', () => {
    const cycle2 = paidRecurringDebt({ principalMinor: 25_000, dueDate: '2026-02-28', recurrenceAnchorDate: '2026-01-31' });
    const cycle3 = buildNextRecurringCycle(cycle2, '2026-03-01T00:00:00.000Z');
    expect(cycle3!.dueDate).toBe('2026-03-31'); // anchor day restored
  });

  it('no second open cycle can be spawned while one is still open', () => {
    const openCycle = makeDebt({ id: 'debt-2', isRecurring: true, recurrenceInterval: 'monthly', recurringGroupId: 'group-1' });
    const settled = paidRecurringDebt({ id: 'debt-1' });
    expect(canGenerateNextRecurringCycle([openCycle], settled)).toBe(false);
  });
});

describe('[owed_to_me] personal loan with 12% APR interest', () => {
  const loanDebt = makeDebt({
    principalMinor: 500_000, // ₱5,000
    interestRateBps: 1200,
    interestStartMode: 'immediate',
    interestAccrualFrequency: 'monthly',
    interestStartDate: '2026-01-01',
  });

  it('no interest before 1 month has elapsed', () => {
    expect(projectDebtLedger(loanDebt, new Date('2026-01-31')).accruedInterestMinor).toBe(0);
  });

  it('accrues ₱50.00 after 1 month (1% of ₱5,000)', () => {
    const snap = projectDebtLedger(loanDebt, new Date('2026-02-01'));
    expect(snap.accruedInterestMinor).toBe(5_000);
  });

  it('accrues ₱300.00 interest after 6 months', () => {
    const snap = projectDebtLedger(loanDebt, new Date('2026-07-01'));
    expect(snap.accruedInterestMinor).toBe(30_000);
    expect(snap.totalDueMinor).toBe(530_000);
  });

  it('payment goes to interest first, then principal (waterfall)', () => {
    // After 1 month: ₱50 interest outstanding, then ₱150 payment covers interest + ₱100 principal
    const debt = makeDebt({
      principalMinor: 500_000,
      interestRateBps: 1200,
      interestStartMode: 'immediate',
      interestAccrualFrequency: 'monthly',
      interestStartDate: '2026-01-01',
      payments: [payment('p1', 6_500, '2026-02-01T00:00:00.000Z', 5_000)], // ₱65 total; ₱50 interest + ₱15 principal
    });
    const snap = projectDebtLedger(debt, new Date('2026-02-01'));
    expect(snap.interestPaidMinor).toBe(5_000);
    expect(snap.principalPaidMinor).toBe(1_500);
  });

  it('payment before interest start date applies entirely to principal', () => {
    const debt = makeDebt({
      principalMinor: 500_000,
      interestRateBps: 1200,
      interestStartMode: 'after_due',
      interestAccrualFrequency: 'monthly',
      dueDate: '2026-03-01',
      interestStartDate: '2026-03-01',
      payments: [payment('p1', 100_000, '2026-01-15T00:00:00.000Z')],
    });
    const snap = projectDebtLedger(debt, new Date('2026-02-01'));
    expect(snap.interestPaidMinor).toBe(0);
    expect(snap.principalPaidMinor).toBe(100_000);
    expect(snap.remainingMinor).toBe(400_000);
  });
});

// ─── 3. I OWE — supported scenarios ──────────────────────────────────────────

describe('[i_owe] borrowed cash from friend for gas', () => {
  it('creates i-owe debt correctly', () => {
    const debt = createDebtFromInput(
      makeInput({ type: 'i_owe', amount: 200, note: 'gas money' }),
      '2026-01-01T00:00:00.000Z'
    );
    expect(debt.type).toBe('i_owe');
    expect(debt.principalMinor).toBe(20_000);
  });

  it('full amount outstanding before repayment', () => {
    const debt = makeDebt({ type: 'i_owe', principalMinor: 20_000 });
    expect(projectDebtLedger(debt).remainingMinor).toBe(20_000);
  });

  it('settled after full repayment', () => {
    const debt = makeDebt({
      type: 'i_owe',
      principalMinor: 20_000,
      payments: [payment('p1', 20_000, '2026-01-05T00:00:00.000Z')],
    });
    expect(projectDebtLedger(debt).isSettled).toBe(true);
  });
});

describe('[i_owe] friend paid my share of hotel during trip', () => {
  it('₱3,000 owed to friend, two equal instalments of ₱1,500', () => {
    const debt = makeDebt({
      type: 'i_owe',
      principalMinor: 300_000,
      payments: [
        payment('p1', 150_000, '2026-01-10T00:00:00.000Z'),
        payment('p2', 150_000, '2026-02-10T00:00:00.000Z'),
      ],
    });
    const snap = projectDebtLedger(debt, new Date('2026-02-15'));
    expect(snap.totalPaidMinor).toBe(300_000);
    expect(snap.isSettled).toBe(true);
  });
});

describe('[i_owe] personal loan from family member', () => {
  it('two partial repayments, balance still remaining', () => {
    const debt = makeDebt({
      type: 'i_owe',
      principalMinor: 300_000,
      payments: [
        payment('p1', 100_000, '2026-01-10T00:00:00.000Z'),
        payment('p2', 100_000, '2026-02-10T00:00:00.000Z'),
      ],
    });
    const snap = projectDebtLedger(debt, new Date('2026-03-01'));
    expect(snap.totalPaidMinor).toBe(200_000);
    expect(snap.remainingMinor).toBe(100_000);
    expect(snap.isSettled).toBe(false);
  });
});

describe('[i_owe] monthly subscription friend pays for me (recurring)', () => {
  it('weekly allowance advances 7 days per cycle', () => {
    expect(advanceRecurringDueDate('2026-01-01', '2026-01-01', 'weekly')).toBe('2026-01-08');
    expect(advanceRecurringDueDate('2026-01-01', '2026-01-08', 'weekly')).toBe('2026-01-15');
  });

  it('yearly debt advances by one calendar year', () => {
    expect(advanceRecurringDueDate('2026-06-15', '2026-06-15', 'yearly')).toBe('2027-06-15');
  });
});

// ─── 4. RECURRING ENGINE — exhaustive date coverage ──────────────────────────

describe('[recurring] advanceRecurringDueDate', () => {
  it('monthly: regular month advances by one calendar month', () => {
    expect(advanceRecurringDueDate('2026-03-15', '2026-03-15', 'monthly')).toBe('2026-04-15');
  });

  it('monthly: Jan 31 → Feb 28 (anchor clamped to short month)', () => {
    expect(advanceRecurringDueDate('2026-01-31', '2026-01-31', 'monthly')).toBe('2026-02-28');
  });

  it('monthly: Feb 28 → Mar 31 (anchor day restored)', () => {
    expect(advanceRecurringDueDate('2026-01-31', '2026-02-28', 'monthly')).toBe('2026-03-31');
  });

  it('monthly: Dec 31 → Jan 31 (year boundary)', () => {
    expect(advanceRecurringDueDate('2026-12-31', '2026-12-31', 'monthly')).toBe('2027-01-31');
  });

  it('weekly: 7 days forward', () => {
    expect(advanceRecurringDueDate('2026-01-01', '2026-01-01', 'weekly')).toBe('2026-01-08');
  });

  it('weekly: crosses month boundary', () => {
    expect(advanceRecurringDueDate('2026-01-28', '2026-01-28', 'weekly')).toBe('2026-02-04');
  });

  it('yearly: same month and day next year', () => {
    expect(advanceRecurringDueDate('2026-06-15', '2026-06-15', 'yearly')).toBe('2027-06-15');
  });
});

describe('[recurring] cycle spawn rules', () => {
  it('returns null if debt is not recurring', () => {
    const debt = paidRecurringDebt({ isRecurring: false });
    expect(buildNextRecurringCycle(debt, '2026-02-01T00:00:00.000Z')).toBeNull();
  });

  it('returns null if status is not paid', () => {
    const debt = paidRecurringDebt({ status: 'pending' });
    expect(buildNextRecurringCycle(debt, '2026-02-01T00:00:00.000Z')).toBeNull();
  });

  it('returns null if anchor date is missing', () => {
    const debt = paidRecurringDebt({ recurrenceAnchorDate: undefined });
    expect(buildNextRecurringCycle(debt, '2026-02-01T00:00:00.000Z')).toBeNull();
  });

  it('returns null if due date is missing', () => {
    const debt = paidRecurringDebt({ dueDate: undefined });
    expect(buildNextRecurringCycle(debt, '2026-02-01T00:00:00.000Z')).toBeNull();
  });

  it('new cycle starts as pending', () => {
    const next = buildNextRecurringCycle(paidRecurringDebt(), '2026-02-01T00:00:00.000Z');
    expect(next!.status).toBe('pending');
  });

  it('new cycle has no payment history', () => {
    const next = buildNextRecurringCycle(paidRecurringDebt(), '2026-02-01T00:00:00.000Z');
    expect(next!.payments).toEqual([]);
  });

  it('new cycle has a fresh unique id', () => {
    const parent = paidRecurringDebt();
    const next = buildNextRecurringCycle(parent, '2026-02-01T00:00:00.000Z');
    expect(next!.id).not.toBe(parent.id);
  });

  it('new cycle preserves recurringGroupId', () => {
    const next = buildNextRecurringCycle(paidRecurringDebt({ recurringGroupId: 'my-group' }), '2026-02-01T00:00:00.000Z');
    expect(next!.recurringGroupId).toBe('my-group');
  });
});

describe('[recurring] hasOpenRecurringCycle', () => {
  it('returns false for empty list', () => {
    expect(hasOpenRecurringCycle([], 'group-1')).toBe(false);
  });

  it('returns false when no debt belongs to the group', () => {
    const debt = makeDebt({ recurringGroupId: 'group-X', status: 'pending' });
    expect(hasOpenRecurringCycle([debt], 'group-1')).toBe(false);
  });

  it('returns true when an unpaid debt belongs to the group', () => {
    const debt = makeDebt({ recurringGroupId: 'group-1', status: 'pending' });
    expect(hasOpenRecurringCycle([debt], 'group-1')).toBe(true);
  });

  it('returns false when all matching debts are paid', () => {
    const debt = makeDebt({ recurringGroupId: 'group-1', status: 'paid' });
    expect(hasOpenRecurringCycle([debt], 'group-1')).toBe(false);
  });

  it('returns false for undefined groupId', () => {
    expect(hasOpenRecurringCycle([], undefined)).toBe(false);
  });
});

// ─── 5. UNSUPPORTED SCENARIOS ─────────────────────────────────────────────────
//
// These tests document the *current* limited behaviour.
// Each test block is labeled with a TODO explaining the missing feature.
//
// ─────────────────────────────────────────────────────────────────────────────

describe('[UNSUPPORTED] multi-person debt from a single payment', () => {
  /**
   * TODO: There is no "split a single owed-to-me amount across multiple people" flow.
   * Currently: you must create one debt record per person manually.
   * Expected future behaviour: one entry → select N people → auto-creates N debt records.
   */

  it('current: two separate debt records are needed for two people who owe you', () => {
    const alice = createDebtFromInput(makeInput({ personName: 'Alice', amount: 500 }), '2026-01-01T00:00:00.000Z');
    const bob = createDebtFromInput(makeInput({ personName: 'Bob', amount: 500 }), '2026-01-01T00:00:00.000Z');

    // Both debts are independent — no shared "source" linkage
    expect(alice.personName).toBe('Alice');
    expect(bob.personName).toBe('Bob');
    expect(alice.id).not.toBe(bob.id);

    // TODO: future API should allow:
    //   const debts = splitDebtAcross({ amount: 1000, people: ['Alice', 'Bob'] })
    //   expect(debts).toHaveLength(2)
    //   expect(debts.every(d => d.sourceGroupId === someSharedId)).toBe(true)
  });
});

describe('[UNSUPPORTED] recurring debt with carry-over unpaid balance', () => {
  /**
   * TODO: When a recurring cycle has partial payments and is then "settled early",
   * the next cycle always starts with the full original principal.
   * Remaining unpaid balance from the previous cycle is NOT carried forward.
   *
   * Expected future behaviour: if a cycle was only partially paid, the remaining
   * balance is added to the next cycle's principal.
   */

  it('current: new cycle resets to full original principal regardless of partial payments', () => {
    const partiallyPaidCycle = paidRecurringDebt({
      principalMinor: 500_000,   // ₱5,000 rent
      payments: [payment('p1', 200_000, '2026-01-15T00:00:00.000Z')], // only ₱2,000 paid
    });

    const nextCycle = buildNextRecurringCycle(partiallyPaidCycle, '2026-02-01T00:00:00.000Z');

    // CURRENT behaviour: next cycle still starts at ₱5,000 (no carry-over)
    expect(nextCycle!.principalMinor).toBe(500_000);

    // TODO: expected future behaviour:
    //   const unpaid = 300_000 // ₱3,000 remaining from last cycle
    //   expect(nextCycle!.principalMinor).toBe(500_000 + unpaid) // ₱8,000
  });
});

describe('[UNSUPPORTED] compound interest', () => {
  /**
   * TODO: Only simple interest (flat rate on unpaid balance per period) is supported.
   * Compound interest (interest on interest) is not implemented.
   *
   * Expected future behaviour: an `interestType: 'compound'` option that compounds
   * outstanding interest into the principal each period.
   */

  it('current: interest is calculated as simple (flat rate on original principal only)', () => {
    // 12% APR monthly on ₱1,000 principal, no payments
    const debt = makeDebt({
      principalMinor: 100_000,
      interestRateBps: 1200,
      interestStartMode: 'immediate',
      interestAccrualFrequency: 'monthly',
      interestStartDate: '2026-01-01',
    });

    const snapMonth1 = projectDebtLedger(debt, new Date('2026-02-01'));
    const snapMonth2 = projectDebtLedger(debt, new Date('2026-03-01'));
    const snapMonth3 = projectDebtLedger(debt, new Date('2026-04-01'));

    // Simple interest: each month adds exactly 1% of the original ₱1,000 = ₱10
    expect(snapMonth1.accruedInterestMinor).toBe(1_000);  // ₱10
    expect(snapMonth2.accruedInterestMinor).toBe(2_000);  // ₱20
    expect(snapMonth3.accruedInterestMinor).toBe(3_000);  // ₱30

    // TODO: with compound interest, month 2 interest would be calculated on ₱1,010
    // so accruedInterestMinor for month 2 would be > 2_000 (specifically 2_010)
  });
});

describe('[UNSUPPORTED] multi-currency debt', () => {
  /**
   * TODO: The app has a single currency setting. A debt cannot be recorded in a
   * currency different from the app's configured currency.
   *
   * Expected future behaviour: each Debt record has an optional `currency` field,
   * and a conversion rate can be specified at the time of recording.
   */

  it('current: debt records have no currency field — single currency assumed', () => {
    const debt = createDebtFromInput(
      makeInput({ personName: 'Overseas Friend', amount: 100 }),
      '2026-01-01T00:00:00.000Z'
    );

    // No currency field on the Debt object
    expect((debt as unknown as Record<string, unknown>).currency).toBeUndefined();

    // TODO: expected future behaviour:
    //   const debtInUSD = createDebtFromInput({ ...input, currency: 'USD', conversionRate: 56 }, ...)
    //   expect(debtInUSD.currency).toBe('USD')
    //   expect(debtInUSD.principalMinor).toBe(560_000) // converted to PHP minor units
  });
});

describe('[UNSUPPORTED] installment / amortisation schedule', () => {
  /**
   * TODO: A "borrowed ₱5,000, pay ₱500/month" instalment plan is not natively modelled.
   * Recurring debt can approximate this but spawns a fresh full-amount cycle each time —
   * it does not track a shared diminishing balance across cycles.
   *
   * Expected future behaviour: an `InstallmentPlan` that tracks the total borrowed,
   * number of instalments, and generates fixed-amount recurring records linked to
   * the same diminishing principal.
   */

  it('current: recurring debt always resets principal — it cannot model a reducing instalment plan', () => {
    const cycle1 = paidRecurringDebt({ principalMinor: 50_000 }); // ₱500 instalment
    const cycle2 = buildNextRecurringCycle(cycle1, '2026-02-01T00:00:00.000Z');
    const cycle3 = buildNextRecurringCycle(
      { ...cycle2!, status: 'paid', paidAt: '2026-03-01T00:00:00.000Z' },
      '2026-03-01T00:00:00.000Z'
    );

    // All cycles have the same ₱500 amount — no diminishing balance
    expect(cycle2!.principalMinor).toBe(50_000);
    expect(cycle3!.principalMinor).toBe(50_000);

    // TODO: expected future behaviour for a ₱5,000 loan over 10 months:
    //   const plan = createInstallmentPlan({ totalMinor: 500_000, instalments: 10 })
    //   expect(plan.instalmentMinor).toBe(50_000)
    //   expect(plan.remainingAfterCycle(3)).toBe(350_000) // ₱3,500 remaining after 3 payments
  });
});

describe('[UNSUPPORTED] future-dated debt (starts accruing later)', () => {
  /**
   * TODO: A debt cannot be created today but set to only become "active" on a
   * future date. Interest starts at creation time (or at the due date with after_due mode),
   * but the debt itself is immediately live in the transaction list.
   *
   * Expected future behaviour: a `startDate` field that keeps the debt inactive
   * and out of totals until that date is reached.
   */

  it('current: a debt is immediately active upon creation regardless of due date', () => {
    const debt = createDebtFromInput(
      makeInput({ dueDate: '2026-06-01', amount: 1000 }),  // due date is 5 months away
      '2026-01-01T00:00:00.000Z'
    );

    // The debt is already "pending" and counted in balances from day 1
    expect(debt.status).toBe('pending');
    expect(debt.createdAt).toBe('2026-01-01T00:00:00.000Z');

    // TODO: expected future behaviour:
    //   const debt = createDebtFromInput({ ...input, startDate: '2026-06-01' }, ...)
    //   expect(isDebtActiveOn(debt, new Date('2026-03-01'))).toBe(false)
    //   expect(isDebtActiveOn(debt, new Date('2026-06-01'))).toBe(true)
  });
});

describe('[UNSUPPORTED] interest-on-interest (compound) for recurring cycles', () => {
  /**
   * TODO: When a recurring debt has interest, each new cycle resets accrued interest to 0.
   * Any outstanding interest from the previous cycle is discarded when the next cycle spawns.
   *
   * Expected future behaviour: outstanding interest from the previous cycle is
   * carried forward into the new cycle's starting balance.
   */

  it('current: interest fields reset to zero on each new recurring cycle', () => {
    const fields = buildInterestFields(
      {
        personName: 'Alice',
        amount: 100,
        type: 'owed_to_me',
        interestRateBps: 1200,
        interestStartMode: 'immediate',
        interestAccrualFrequency: 'monthly',
        isRecurring: true,
        recurrenceInterval: 'monthly',
        dueDate: '2026-02-01',
      },
      '2026-02-01T00:00:00.000Z'
    );

    // Each new cycle always starts with 0 accrued interest
    expect(fields.accruedInterestMinor).toBe(0);
    expect(fields.interestPaidMinor).toBe(0);

    // TODO: expected future behaviour for carry-over:
    //   const prevCycleUnpaidInterest = 300 // ₱3.00 unpaid from last cycle
    //   expect(newCycle.accruedInterestMinor).toBe(prevCycleUnpaidInterest)
  });
});
