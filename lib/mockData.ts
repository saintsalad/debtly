import { Debt } from '@/features/debts/types';

const now = new Date();
const d = (n: number) => new Date(now.getTime() + n * 864e5).toISOString();

export const INITIAL_DEBTS: Debt[] = [
  {
    id: 'mock-1',
    personName: 'Alex Johnson',
    amount: 150,
    type: 'owed_to_me',
    note: 'Lunch split at The Grove',
    dueDate: d(3),
    status: 'pending',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  },
  {
    id: 'mock-2',
    personName: 'Sarah Chen',
    amount: 45.5,
    type: 'owed_to_me',
    note: 'Movie tickets for Avatar',
    dueDate: d(-2),
    status: 'pending',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  },
  {
    id: 'mock-3',
    personName: 'Mike Rodriguez',
    amount: 80,
    type: 'i_owe',
    note: 'Uber rides last weekend',
    dueDate: d(7),
    status: 'pending',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  },
  {
    id: 'mock-4',
    personName: 'Emma Wilson',
    amount: 200,
    type: 'owed_to_me',
    note: 'Concert tickets advance',
    dueDate: d(-5),
    status: 'paid',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  },
  {
    id: 'mock-5',
    personName: 'James Park',
    amount: 35,
    type: 'i_owe',
    note: 'Coffee and snacks run',
    dueDate: d(14),
    status: 'pending',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  },
];
