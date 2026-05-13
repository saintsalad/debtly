import { addDays, subDays, subMonths } from 'date-fns';
import { interestRateToBps } from '@/features/debts/interestEngine';
import { majorToMinor } from '@/features/debts/money';
import { Debt, DebtPayment, DebtType } from '@/features/debts/types';

const NOW = new Date();

type MockDebtScenario = {
  id: string;
  personName: string;
  amount: number;
  type: DebtType;
  note?: string;
  createdAt: Date;
  dueDate?: Date;
  status?: 'pending' | 'paid';
  payments?: DebtPayment[];
  interestRatePercent?: number;
  interestStartMode?: 'immediate' | 'after_due';
  interestAccrualFrequency?: 'monthly' | 'yearly';
  isRecurring?: boolean;
  recurrenceInterval?: 'weekly' | 'monthly' | 'yearly';
};

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildMockDebt(scenario: MockDebtScenario): Debt {
  const principalMinor = majorToMinor(scenario.amount);
  const createdAt = scenario.createdAt.toISOString();
  const payments = scenario.payments ?? [];
  const principalPaidMinor = payments.reduce(
    (sum, payment) => sum + payment.principalAppliedMinor,
    0
  );
  const interestPaidMinor = payments.reduce(
    (sum, payment) => sum + payment.interestAppliedMinor,
    0
  );
  const status = scenario.status ?? 'pending';
  const dueDate = scenario.dueDate ? toDateOnly(scenario.dueDate) : undefined;

  return {
    id: scenario.id,
    personName: scenario.personName,
    principalMinor,
    type: scenario.type,
    note: scenario.note,
    dueDate,
    status,
    paidAt: status === 'paid' ? createdAt : undefined,
    interestRateBps: scenario.interestRatePercent
      ? interestRateToBps(scenario.interestRatePercent)
      : undefined,
    interestStartMode: scenario.interestStartMode,
    interestAccrualFrequency: scenario.interestAccrualFrequency,
    interestStartDate: scenario.interestRatePercent ? toDateOnly(scenario.createdAt) : undefined,
    isRecurring: scenario.isRecurring,
    recurrenceInterval: scenario.recurrenceInterval,
    recurrenceAnchorDate: scenario.isRecurring ? dueDate : undefined,
    nextCycleDate: scenario.isRecurring ? dueDate : undefined,
    interestPaidMinor,
    principalPaidMinor: status === 'paid' ? principalMinor : principalPaidMinor,
    createdAt,
    updatedAt: createdAt,
    payments,
    recurringGroupId: scenario.id,
    recurringSourceId: scenario.id,
  };
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

const MOCK_DEBT_SCENARIOS: MockDebtScenario[] = [
  {
    id: 'mock-1',
    personName: 'Alex Johnson',
    amount: 150,
    type: 'owed_to_me',
    note: 'Lunch split at The Grove',
    createdAt: subDays(NOW, 2),
    dueDate: addDays(NOW, 3),
    interestRatePercent: 5,
    interestStartMode: 'immediate',
    interestAccrualFrequency: 'monthly',
  },
  {
    id: 'mock-2',
    personName: 'Sarah Chen',
    amount: 45.5,
    type: 'owed_to_me',
    note: 'Movie tickets',
    createdAt: subDays(NOW, 4),
    dueDate: subDays(NOW, 2),
    payments: [payment('mock-2-pay-1', 20, subDays(NOW, 6), 'First installment')],
  },
  {
    id: 'mock-3',
    personName: 'Mike Rodriguez',
    amount: 80,
    type: 'i_owe',
    note: 'Uber rides last weekend',
    createdAt: subDays(NOW, 1),
    dueDate: addDays(NOW, 7),
    isRecurring: true,
    recurrenceInterval: 'monthly',
  },
  {
    id: 'mock-4',
    personName: 'Emma Wilson',
    amount: 200,
    type: 'owed_to_me',
    note: 'Concert tickets advance',
    createdAt: subDays(NOW, 10),
    dueDate: subDays(NOW, 5),
    status: 'paid',
  },
  {
    id: 'mock-5',
    personName: 'James Park',
    amount: 35,
    type: 'i_owe',
    note: 'Coffee and snacks run',
    createdAt: subDays(NOW, 3),
    dueDate: addDays(NOW, 14),
  },
  {
    id: 'mock-6',
    personName: 'Priya Nair',
    amount: 120,
    type: 'owed_to_me',
    note: 'Group dinner reimbursement',
    createdAt: subMonths(NOW, 1),
    dueDate: subDays(NOW, 12),
  },
  {
    id: 'mock-7',
    personName: 'Daniel Ortiz',
    amount: 62.75,
    type: 'i_owe',
    note: 'Shared streaming subscription',
    createdAt: subMonths(NOW, 1),
    dueDate: addDays(NOW, 2),
    isRecurring: true,
    recurrenceInterval: 'monthly',
  },
  {
    id: 'mock-8',
    personName: 'Hannah Lee',
    amount: 18,
    type: 'owed_to_me',
    note: 'Parking split',
    createdAt: subMonths(NOW, 1),
    dueDate: addDays(NOW, 5),
    status: 'paid',
  },
  {
    id: 'mock-9',
    personName: 'Noah Brooks',
    amount: 250,
    type: 'i_owe',
    note: 'Weekend cabin rental share',
    createdAt: subMonths(NOW, 2),
    dueDate: subDays(NOW, 20),
    payments: [payment('mock-9-pay-1', 100, subMonths(NOW, 1), 'Deposit')],
  },
  {
    id: 'mock-10',
    personName: 'Olivia Grant',
    amount: 95,
    type: 'owed_to_me',
    note: 'Baby shower gift pool',
    createdAt: subMonths(NOW, 2),
    dueDate: addDays(NOW, 18),
  },
  {
    id: 'mock-11',
    personName: 'Ethan Moore',
    amount: 40,
    type: 'i_owe',
    note: 'Board game night snacks',
    createdAt: subMonths(NOW, 2),
    dueDate: subDays(NOW, 1),
  },
  {
    id: 'mock-12',
    personName: 'Mia Santos',
    amount: 310,
    type: 'owed_to_me',
    note: 'Freelance invoice advance',
    createdAt: subMonths(NOW, 3),
    dueDate: subDays(NOW, 30),
    interestRatePercent: 8,
    interestStartMode: 'after_due',
    interestAccrualFrequency: 'monthly',
  },
  {
    id: 'mock-13',
    personName: 'Liam Carter',
    amount: 27.5,
    type: 'i_owe',
    note: 'Lunch tab',
    createdAt: subMonths(NOW, 3),
    dueDate: addDays(NOW, 4),
    status: 'paid',
  },
  {
    id: 'mock-14',
    personName: 'Ava Thompson',
    amount: 72,
    type: 'owed_to_me',
    note: 'Airport shuttle',
    createdAt: subMonths(NOW, 3),
    dueDate: addDays(NOW, 9),
    payments: [payment('mock-14-pay-1', 30, subMonths(NOW, 2))],
  },
  {
    id: 'mock-15',
    personName: 'Lucas Kim',
    amount: 500,
    type: 'i_owe',
    note: 'Security deposit loan',
    createdAt: subMonths(NOW, 4),
    dueDate: subDays(NOW, 45),
    payments: [
      payment('mock-15-pay-1', 150, subMonths(NOW, 3)),
      payment('mock-15-pay-2', 100, subMonths(NOW, 2)),
    ],
  },
  {
    id: 'mock-16',
    personName: 'Sophie Martin',
    amount: 14.25,
    type: 'owed_to_me',
    note: 'Vending machine change',
    createdAt: subMonths(NOW, 4),
    dueDate: addDays(NOW, 1),
  },
  {
    id: 'mock-17',
    personName: 'Ben Rivera',
    amount: 88,
    type: 'i_owe',
    note: 'Gym membership split',
    createdAt: subMonths(NOW, 4),
    isRecurring: true,
    recurrenceInterval: 'yearly',
    dueDate: addDays(NOW, 60),
  },
  {
    id: 'mock-18',
    personName: 'Chloe Adams',
    amount: 165,
    type: 'owed_to_me',
    note: 'Photography session fee',
    createdAt: subMonths(NOW, 5),
    dueDate: subDays(NOW, 10),
    status: 'paid',
  },
  {
    id: 'mock-19',
    personName: 'Marcus Hill',
    amount: 54,
    type: 'i_owe',
    note: 'Concert merch',
    createdAt: subMonths(NOW, 5),
    dueDate: subDays(NOW, 3),
  },
  {
    id: 'mock-20',
    personName: 'Isabella Rossi',
    amount: 220,
    type: 'owed_to_me',
    note: 'Wedding vendor deposit',
    createdAt: subMonths(NOW, 5),
    dueDate: addDays(NOW, 25),
    payments: [payment('mock-20-pay-1', 80, subMonths(NOW, 4))],
  },
  {
    id: 'mock-21',
    personName: 'Ryan Patel',
    amount: 33,
    type: 'i_owe',
    note: 'Team lunch',
    createdAt: subMonths(NOW, 6),
    dueDate: addDays(NOW, 6),
  },
  {
    id: 'mock-22',
    personName: 'Nina Volkov',
    amount: 410,
    type: 'owed_to_me',
    note: 'Apartment repair reimbursement',
    createdAt: subMonths(NOW, 6),
    dueDate: subDays(NOW, 18),
    interestRatePercent: 6,
    interestStartMode: 'immediate',
    interestAccrualFrequency: 'yearly',
  },
  {
    id: 'mock-23',
    personName: 'Chris Young',
    amount: 19.99,
    type: 'i_owe',
    note: 'App subscription',
    createdAt: subMonths(NOW, 6),
    dueDate: addDays(NOW, 12),
    status: 'paid',
  },
  {
    id: 'mock-24',
    personName: 'Taylor Reed',
    amount: 76,
    type: 'owed_to_me',
    note: 'Camping supplies',
    createdAt: subMonths(NOW, 7),
    dueDate: subDays(NOW, 7),
  },
  {
    id: 'mock-25',
    personName: 'Jordan Blake',
    amount: 130,
    type: 'i_owe',
    note: 'Car wash and fuel',
    createdAt: subMonths(NOW, 7),
    dueDate: addDays(NOW, 20),
    payments: [payment('mock-25-pay-1', 50, subMonths(NOW, 6))],
  },
  {
    id: 'mock-26',
    personName: 'Elena Costa',
    amount: 48,
    type: 'owed_to_me',
    note: 'Book club order',
    createdAt: subMonths(NOW, 8),
    dueDate: addDays(NOW, 11),
  },
  {
    id: 'mock-27',
    personName: 'Sam Nguyen',
    amount: 290,
    type: 'i_owe',
    note: 'Furniture delivery fee',
    createdAt: subMonths(NOW, 8),
    dueDate: subDays(NOW, 25),
  },
  {
    id: 'mock-28',
    personName: 'Grace Okafor',
    amount: 60,
    type: 'owed_to_me',
    note: 'Ride share to airport',
    createdAt: subMonths(NOW, 9),
    dueDate: subDays(NOW, 40),
    status: 'paid',
  },
  {
    id: 'mock-29',
    personName: 'Felix Bauer',
    amount: 102.5,
    type: 'i_owe',
    note: 'Office party supplies',
    createdAt: subMonths(NOW, 9),
    dueDate: addDays(NOW, 8),
  },
  {
    id: 'mock-30',
    personName: 'Riley Morgan',
    amount: 175,
    type: 'owed_to_me',
    note: 'Language class fee',
    createdAt: subMonths(NOW, 10),
    dueDate: addDays(NOW, 16),
    payments: [payment('mock-30-pay-1', 60, subMonths(NOW, 9))],
  },
  {
    id: 'mock-31',
    personName: 'Carmen Diaz',
    amount: 24,
    type: 'i_owe',
    note: 'Borrowed cash for transit',
    createdAt: subMonths(NOW, 10),
  },
  {
    id: 'mock-32',
    personName: 'Harper Quinn',
    amount: 360,
    type: 'owed_to_me',
    note: 'Event booth rental',
    createdAt: subMonths(NOW, 11),
    dueDate: addDays(NOW, 3),
    isRecurring: true,
    recurrenceInterval: 'weekly',
  },
];

export const INITIAL_DEBTS: Debt[] = MOCK_DEBT_SCENARIOS.map(buildMockDebt);
