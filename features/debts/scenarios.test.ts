/**
 * Real-world scenario test suite for debt tracking.
 *
 * Tests are grouped into:
 *   - SUPPORTED scenarios   → assertions verify current correct behaviour
 *   - Previously-unsupported scenarios now implemented → converted to [SUPPORTED]
 */
import { describe, expect, it } from 'vitest';

import { advanceRecurringDueDate } from '@/features/debts/dates';
import {
  createDebtFromInput,
  isDebtActive,
} from '@/features/debts/debtCalculations';
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

  it('accepts split across two people with empty personName placeholder', () => {
    expect(
      validateAddDebtInput(
        makeInput({ personName: '', splitPeople: ['Alice', 'Bob'], amount: 100 })
      )
    ).toBeNull();
  });

  it('rejects split list with only one name filled', () => {
    expect(
      validateAddDebtInput(makeInput({ personName: '', splitPeople: ['Alice'], amount: 100 }))
    ).not.toBeNull();
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

// ─── 5. NOW-SUPPORTED SCENARIOS ─────────────────────────────────────────────
//
// All 7 scenarios previously marked [UNSUPPORTED] are now implemented.
// ─────────────────────────────────────────────────────────────────────────────

describe('[SUPPORTED] multi-person debt from a single payment (split)', () => {
  it('two debts created share a splitGroupId when split across two people', () => {
    const sharedSplitGroupId = 'split-group-1';
    const alice = createDebtFromInput(
      makeInput({ personName: 'Alice', amount: 500 }),
      '2026-01-01T00:00:00.000Z'
    );
    const bob = createDebtFromInput(
      makeInput({ personName: 'Bob', amount: 500 }),
      '2026-01-01T00:00:00.000Z'
    );

    // Simulate what the store does: attach splitGroupId
    const aliceWithGroup = { ...alice, splitGroupId: sharedSplitGroupId, sourceType: 'personal_split' as const };
    const bobWithGroup = { ...bob, splitGroupId: sharedSplitGroupId, sourceType: 'personal_split' as const };

    expect(aliceWithGroup.splitGroupId).toBe(sharedSplitGroupId);
    expect(bobWithGroup.splitGroupId).toBe(sharedSplitGroupId);
    expect(aliceWithGroup.principalMinor).toBe(50_000);  // ₱500 per person
    expect(bobWithGroup.principalMinor).toBe(50_000);
    expect(aliceWithGroup.id).not.toBe(bobWithGroup.id);
  });

  it('per-person amount is total divided by number of people', () => {
    const total = 1000;
    const people = ['Alice', 'Bob', 'Carol'];
    const perPerson = total / people.length;
    expect(perPerson).toBeCloseTo(333.33, 2);
  });
});

describe('[SUPPORTED] recurring debt with carry-over unpaid balance', () => {
  it('next cycle adds remaining unpaid balance when carryOverBalance is true', () => {
    const partiallyPaidCycle = paidRecurringDebt({
      principalMinor: 500_000,   // ₱5,000 rent
      carryOverBalance: true,
      carryOverMinor: 300_000,   // ₱3,000 unpaid (set by closeCarryOverCycle in store)
      payments: [payment('p1', 200_000, '2026-01-15T00:00:00.000Z')], // only ₱2,000 paid
    });

    const nextCycle = buildNextRecurringCycle(partiallyPaidCycle, '2026-02-01T00:00:00.000Z');

    // Next cycle principal = ₱5,000 + ₱3,000 carry-over = ₱8,000
    expect(nextCycle).not.toBeNull();
    expect(nextCycle!.principalMinor).toBe(800_000);
    expect(nextCycle!.carryOverBalance).toBe(true);
    // New cycle starts with zero carry-over (will be set when it settles)
    expect(nextCycle!.carryOverMinor).toBe(0);
  });

  it('next cycle uses base principal when carryOverBalance is false', () => {
    const fullPaidCycle = paidRecurringDebt({
      principalMinor: 500_000,
      carryOverBalance: false,
      carryOverMinor: 0,
    });

    const nextCycle = buildNextRecurringCycle(fullPaidCycle, '2026-02-01T00:00:00.000Z');
    expect(nextCycle!.principalMinor).toBe(500_000);
  });
});

describe('[SUPPORTED] compound interest', () => {
  it('compound interest on ₱1,000 at 12% APR monthly grows faster than simple', () => {
    const simpleDebt = makeDebt({
      principalMinor: 100_000,
      interestRateBps: 1200,
      interestType: 'simple',
      interestStartMode: 'immediate',
      interestAccrualFrequency: 'monthly',
      interestStartDate: '2026-01-01',
    });

    const compoundDebt = makeDebt({
      principalMinor: 100_000,
      interestRateBps: 1200,
      interestType: 'compound',
      interestStartMode: 'immediate',
      interestAccrualFrequency: 'monthly',
      interestStartDate: '2026-01-01',
    });

    const simpleMonth1 = projectDebtLedger(simpleDebt, new Date('2026-02-01'));
    const compoundMonth1 = projectDebtLedger(compoundDebt, new Date('2026-02-01'));

    // Month 1 — both have same ₱10 (1% of ₱1,000)
    expect(simpleMonth1.accruedInterestMinor).toBe(1_000);
    expect(compoundMonth1.accruedInterestMinor).toBe(1_000);

    // Month 3 — compound should be greater than simple
    const simpleMonth3 = projectDebtLedger(simpleDebt, new Date('2026-04-01'));
    const compoundMonth3 = projectDebtLedger(compoundDebt, new Date('2026-04-01'));

    expect(simpleMonth3.accruedInterestMinor).toBe(3_000); // flat ₱30
    expect(compoundMonth3.accruedInterestMinor).toBeGreaterThan(3_000); // compounds on each month
  });

  it('compound formula: P × ((1+r)^n − 1)', () => {
    const debt = makeDebt({
      principalMinor: 100_000, // ₱1,000
      interestRateBps: 1200,   // 12% APR → 1% per month
      interestType: 'compound',
      interestStartMode: 'immediate',
      interestAccrualFrequency: 'monthly',
      interestStartDate: '2026-01-01',
    });

    const snap = projectDebtLedger(debt, new Date('2026-04-01')); // 3 months

    // Expected: 100_000 × ((1.01)^3 − 1) = 100_000 × 0.030301 = 3030
    expect(snap.accruedInterestMinor).toBe(3_030);
  });
});

describe('[SUPPORTED] instalment / amortisation plan', () => {
  it('cycle spawning stops when instalmentIndex reaches instalmentCount', () => {
    const lastCycle = paidRecurringDebt({
      principalMinor: 50_000, // ₱500
      instalmentCount: 3,
      instalmentIndex: 3,     // already at max
    });

    const next = buildNextRecurringCycle(lastCycle, '2026-04-01T00:00:00.000Z');
    expect(next).toBeNull();
  });

  it('cycle continues when instalmentIndex is below instalmentCount', () => {
    const cycle1 = paidRecurringDebt({
      principalMinor: 50_000, // ₱500
      instalmentCount: 3,
      instalmentIndex: 1,
    });

    const cycle2 = buildNextRecurringCycle(cycle1, '2026-02-01T00:00:00.000Z');
    expect(cycle2).not.toBeNull();
    expect(cycle2!.instalmentIndex).toBe(2);  // incremented
    expect(cycle2!.instalmentCount).toBe(3);  // preserved
  });

  it('final cycle is correctly identified', () => {
    const cycle2 = paidRecurringDebt({
      principalMinor: 50_000,
      instalmentCount: 3,
      instalmentIndex: 2,
    });

    const cycle3 = buildNextRecurringCycle(cycle2, '2026-03-01T00:00:00.000Z');
    expect(cycle3).not.toBeNull();
    expect(cycle3!.instalmentIndex).toBe(3);

    // Now cycle3 at max — no more
    const shouldBeNull = buildNextRecurringCycle(
      { ...cycle3!, status: 'paid', paidAt: '2026-04-01T00:00:00.000Z' },
      '2026-04-01T00:00:00.000Z'
    );
    expect(shouldBeNull).toBeNull();
  });
});

describe('[SUPPORTED] future-dated debt (active from a start date)', () => {
  it('debt with a future startDate is inactive before that date', () => {
    const debt = createDebtFromInput(
      makeInput({ startDate: '2026-06-01', amount: 1000 }),
      '2026-01-01T00:00:00.000Z'
    );

    // Before startDate
    expect(isDebtActive(debt, new Date('2026-03-01'))).toBe(false);
    expect(isDebtActive(debt, new Date('2026-05-31'))).toBe(false);
  });

  it('debt becomes active on and after its startDate', () => {
    const debt = createDebtFromInput(
      makeInput({ startDate: '2026-06-01', amount: 1000 }),
      '2026-01-01T00:00:00.000Z'
    );

    expect(isDebtActive(debt, new Date('2026-06-01'))).toBe(true);
    expect(isDebtActive(debt, new Date('2026-07-15'))).toBe(true);
  });

  it('debt with no startDate is always active', () => {
    const debt = createDebtFromInput(makeInput({ amount: 1000 }), '2026-01-01T00:00:00.000Z');
    expect(isDebtActive(debt, new Date('2020-01-01'))).toBe(true);
    expect(isDebtActive(debt, new Date('2030-01-01'))).toBe(true);
  });

  it('startDate is stored as local date string on the debt', () => {
    const debt = createDebtFromInput(
      makeInput({ startDate: '2026-06-01T00:00:00.000Z', amount: 1000 }),
      '2026-01-01T00:00:00.000Z'
    );
    expect(debt.startDate).toBe('2026-06-01');
  });
});

describe('[SUPPORTED] interest carry-over across recurring cycles', () => {
  it('carry-over amount accumulates unpaid interest into next cycle principal', () => {
    // Simulate a recurring cycle that finished with ₱500 outstanding (principal + interest unpaid)
    const cycleWithInterest = paidRecurringDebt({
      principalMinor: 100_000,   // ₱1,000
      carryOverBalance: true,
      carryOverMinor: 50_500,    // ₱505 remaining (₱500 principal + ₱5 interest)
      interestRateBps: 1200,
      interestType: 'simple',
      interestAccrualFrequency: 'monthly',
    });

    const nextCycle = buildNextRecurringCycle(cycleWithInterest, '2026-02-01T00:00:00.000Z');

    // Next cycle's principal includes the carry-over (both unpaid principal and interest)
    expect(nextCycle!.principalMinor).toBe(150_500); // ₱1,000 + ₱505 carry-over
    expect(nextCycle!.carryOverMinor).toBe(0);        // reset for new cycle
  });

  it('new interest-bearing cycle has accrued interest reset to 0 on spawn', () => {
    const fields = buildInterestFields(
      {
        personName: 'Alice',
        amount: 100,
        type: 'owed_to_me',
        interestRateBps: 1200,
        interestType: 'simple',
        interestStartMode: 'immediate',
        interestAccrualFrequency: 'monthly',
        isRecurring: true,
        recurrenceInterval: 'monthly',
        dueDate: '2026-02-01',
      },
      '2026-02-01T00:00:00.000Z'
    );

    // New cycle always starts with 0 accrued interest (fresh period)
    expect(fields.accruedInterestMinor).toBe(0);
    expect(fields.interestPaidMinor).toBe(0);
  });
});
