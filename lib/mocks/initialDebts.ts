import { addDays, subDays, subMonths } from 'date-fns';
import { interestRateToBps } from '@/features/debts/interestEngine';
import { majorToMinor } from '@/features/debts/money';
import { Debt, DebtPayment, DebtType } from '@/features/debts/types';

const NOW = new Date();

const MOCK_SPLIT_LUNCH_ID = 'mock-split-lunch';
const MOCK_INSTAL_PLAN_GROUP = 'mock-otm-instal-plan';

type MockDebtScenario = {
  id: string;
  personName: string;
  amount: number;
  type: DebtType;
  note?: string;
  createdAt: Date;
  dueDate?: Date;
  startDate?: Date;
  status?: 'pending' | 'paid';
  payments?: DebtPayment[];
  interestRatePercent?: number;
  interestType?: 'simple' | 'compound';
  interestStartMode?: 'immediate' | 'after_due';
  interestAccrualFrequency?: 'monthly' | 'yearly';
  isRecurring?: boolean;
  recurrenceInterval?: 'weekly' | 'monthly' | 'yearly';
  carryOverBalance?: boolean;
  instalmentCount?: number;
  instalmentIndex?: number;
  /** Major units; defaults to `amount * instalmentCount` when instalments are set. */
  instalmentTotalMajor?: number;
  sourceType?: Debt['sourceType'];
  sourceGroupId?: string;
  splitGroupId?: string;
  recurringGroupId?: string;
  recurringSourceId?: string;
  currency?: string;
  originalAmountMinor?: number;
  conversionRate?: number;
};

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildMockDebt(scenario: MockDebtScenario): Debt {
  const principalMinor = majorToMinor(scenario.amount);
  const createdAt = scenario.createdAt.toISOString();
  const payments = scenario.payments ?? [];
  const interestPaidMinor = payments.reduce((sum, p) => sum + p.interestAppliedMinor, 0);
  const principalPaidFromPayments = payments.reduce((sum, p) => sum + p.principalAppliedMinor, 0);
  const status = scenario.status ?? 'pending';
  const dueDateStr = scenario.dueDate ? toDateOnly(scenario.dueDate) : undefined;
  const startDateStr = scenario.startDate ? toDateOnly(scenario.startDate) : undefined;

  const instalmentCount = scenario.instalmentCount;
  const instalmentIndex =
    instalmentCount != null ? (scenario.instalmentIndex ?? 1) : undefined;
  const instalmentTotalMinor =
    instalmentCount != null
      ? majorToMinor(scenario.instalmentTotalMajor ?? scenario.amount * instalmentCount)
      : undefined;

  const isRecurring = Boolean(
    scenario.isRecurring && scenario.recurrenceInterval && dueDateStr
  );

  const principalPaidMinor =
    status === 'paid' ? principalMinor : principalPaidFromPayments;

  let paidAt: string | undefined;
  if (status === 'paid') {
    if (payments.length > 0) {
      const sorted = [...payments].sort(
        (a, b) => new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime()
      );
      paidAt = sorted[sorted.length - 1]!.paidAt;
    } else {
      paidAt = scenario.dueDate?.toISOString() ?? createdAt;
    }
  }

  const recurringGroupId = scenario.recurringGroupId ?? scenario.id;
  const recurringSourceId = scenario.recurringSourceId ?? scenario.id;

  let recurrenceAnchorDate: string | undefined;
  if (isRecurring && dueDateStr) {
    recurrenceAnchorDate = dueDateStr;
  } else if (instalmentCount != null && scenario.dueDate && dueDateStr) {
    recurrenceAnchorDate = toDateOnly(
      subMonths(scenario.dueDate, (instalmentIndex ?? 1) - 1)
    );
  } else if (scenario.recurrenceInterval && dueDateStr) {
    recurrenceAnchorDate = dueDateStr;
  }

  const debt: Debt = {
    id: scenario.id,
    personName: scenario.personName,
    principalMinor,
    type: scenario.type,
    note: scenario.note,
    dueDate: dueDateStr,
    startDate: startDateStr,
    status,
    paidAt,
    createdAt,
    updatedAt: createdAt,
    payments,
    interestPaidMinor,
    principalPaidMinor,
    recurringGroupId,
    recurringSourceId,
    sourceType: scenario.sourceType,
    sourceGroupId: scenario.sourceGroupId,
    splitGroupId: scenario.splitGroupId,
    currency: scenario.currency,
    originalAmountMinor: scenario.originalAmountMinor,
    conversionRate: scenario.conversionRate,
    isRecurring,
    recurrenceInterval: scenario.recurrenceInterval,
    recurrenceAnchorDate,
    nextCycleDate: isRecurring ? dueDateStr : undefined,
    carryOverBalance: isRecurring ? (scenario.carryOverBalance ?? false) : false,
    instalmentTotal: instalmentTotalMinor,
    instalmentCount,
    instalmentIndex,
  };

  if (scenario.interestRatePercent != null && scenario.interestRatePercent > 0) {
    const interestStartMode = scenario.interestStartMode ?? 'immediate';
    debt.interestRateBps = interestRateToBps(scenario.interestRatePercent);
    debt.interestType = scenario.interestType ?? 'simple';
    debt.interestStartMode = interestStartMode;
    debt.interestAccrualFrequency = scenario.interestAccrualFrequency ?? 'monthly';
    debt.interestStartDate =
      interestStartMode === 'after_due' && dueDateStr
        ? dueDateStr
        : toDateOnly(scenario.createdAt);
    debt.accruedInterestMinor = 0;
  }

  return debt;
}

function payment(
  id: string,
  amount: number,
  paidAt: Date,
  note?: string
): DebtPayment {
  const amountMinor = majorToMinor(amount);

  return {
    id,
    amountMinor,
    interestAppliedMinor: 0,
    principalAppliedMinor: amountMinor,
    paidAt: paidAt.toISOString(),
    note,
  };
}

/** Six `owed_to_me` + six `i_owe` seeds aligned with `Debt` / `createDebtFromInput` fields. */
const MOCK_DEBT_SCENARIOS: MockDebtScenario[] = [
  // —— owed_to_me (6) ——
  {
    id: 'mock-otm-1',
    personName: 'Alex Johnson',
    amount: 150,
    type: 'owed_to_me',
    note: 'Client invoice (USD)',
    createdAt: subDays(NOW, 4),
    dueDate: addDays(NOW, 5),
    currency: 'USD',
    originalAmountMinor: majorToMinor(150),
    interestRatePercent: 5,
    interestType: 'simple',
    interestStartMode: 'immediate',
    interestAccrualFrequency: 'monthly',
  },
  {
    id: 'mock-otm-2',
    personName: 'Sarah Chen',
    amount: 45.5,
    type: 'owed_to_me',
    note: 'Movie tickets',
    createdAt: subDays(NOW, 6),
    dueDate: subDays(NOW, 4),
    payments: [payment('mock-otm-2-pay-1', 18, subDays(NOW, 8), 'Partial')],
  },
  {
    id: 'mock-otm-3',
    personName: 'Emma Wilson',
    amount: 200,
    type: 'owed_to_me',
    note: 'Concert tickets advance',
    createdAt: subMonths(NOW, 2),
    dueDate: subDays(NOW, 38),
    status: 'paid',
  },
  {
    id: 'mock-otm-4',
    personName: 'Morgan Reid',
    amount: 85,
    type: 'owed_to_me',
    note: 'Studio rent — instalment 2 of 6',
    createdAt: subMonths(NOW, 1),
    dueDate: addDays(NOW, 14),
    isRecurring: false,
    recurrenceInterval: 'monthly',
    instalmentCount: 6,
    instalmentIndex: 2,
    instalmentTotalMajor: 85 * 6,
    recurringGroupId: MOCK_INSTAL_PLAN_GROUP,
    recurringSourceId: MOCK_INSTAL_PLAN_GROUP,
  },
  {
    id: 'mock-otm-5',
    personName: 'Riley Park',
    amount: 58.25,
    type: 'owed_to_me',
    note: 'Team dinner (your half)',
    createdAt: subDays(NOW, 3),
    dueDate: addDays(NOW, 11),
    sourceType: 'personal_split',
    splitGroupId: MOCK_SPLIT_LUNCH_ID,
  },
  {
    id: 'mock-otm-6',
    personName: 'Jordan Blake',
    amount: 58.25,
    type: 'owed_to_me',
    note: 'Team dinner (your half)',
    createdAt: subDays(NOW, 3),
    dueDate: addDays(NOW, 11),
    sourceType: 'personal_split',
    splitGroupId: MOCK_SPLIT_LUNCH_ID,
  },
  // —— i_owe (6) ——
  {
    id: 'mock-iow-1',
    personName: 'Mike Rodriguez',
    amount: 24,
    type: 'i_owe',
    note: 'Coworking day pass',
    createdAt: subDays(NOW, 2),
    dueDate: addDays(NOW, 5),
    isRecurring: true,
    recurrenceInterval: 'weekly',
  },
  {
    id: 'mock-iow-2',
    personName: 'Noah Brooks',
    amount: 320,
    type: 'i_owe',
    note: 'Shared equipment',
    createdAt: subDays(NOW, 10),
    dueDate: addDays(NOW, 28),
    interestRatePercent: 7,
    interestType: 'compound',
    interestStartMode: 'immediate',
    interestAccrualFrequency: 'monthly',
  },
  {
    id: 'mock-iow-3',
    personName: 'Ben Rivera',
    amount: 180,
    type: 'i_owe',
    note: 'Annual membership',
    createdAt: subMonths(NOW, 2),
    dueDate: addDays(NOW, 40),
    isRecurring: true,
    recurrenceInterval: 'yearly',
    carryOverBalance: true,
  },
  {
    id: 'mock-iow-4',
    personName: 'Chris Young',
    amount: 62,
    type: 'i_owe',
    note: 'Festival tickets',
    createdAt: subMonths(NOW, 1),
    dueDate: subDays(NOW, 6),
    status: 'paid',
    payments: [payment('mock-iow-4-pay-1', 62, subDays(NOW, 12), 'Settled')],
  },
  {
    id: 'mock-iow-5',
    personName: 'Dana Liu',
    amount: 42,
    type: 'i_owe',
    note: 'Informal loan — no due date yet',
    createdAt: subMonths(NOW, 3),
  },
  {
    id: 'mock-iow-6',
    personName: 'Evan Carr',
    amount: 95,
    type: 'i_owe',
    note: 'Parking pass (starts next week)',
    createdAt: subDays(NOW, 1),
    startDate: addDays(NOW, 7),
    dueDate: addDays(NOW, 35),
  },
];

export const INITIAL_DEBTS: Debt[] = MOCK_DEBT_SCENARIOS.map(buildMockDebt);
