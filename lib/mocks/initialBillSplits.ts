import { subDays, subMonths } from 'date-fns';
import { BillSplit } from '@/features/bill-split/types';

const NOW = new Date();

function participant(
  id: string,
  name: string,
  amount: number,
  paid: boolean
): BillSplit['participants'][number] {
  return { id, name, amount, paid };
}

function buildSplit(
  id: string,
  title: string,
  total: number,
  createdAt: Date,
  participants: BillSplit['participants']
): BillSplit {
  const iso = createdAt.toISOString();
  return {
    id,
    title,
    total,
    participants,
    createdAt: iso,
    updatedAt: iso,
  };
}

/** Seed splits for first launch / empty persisted state. */
export const INITIAL_BILL_SPLITS: BillSplit[] = [
  buildSplit('bs-mock-1', 'Dinner at Lola', 186.5, subDays(NOW, 2), [
    participant('bs-mock-1-p1', 'Alex', 46.63, true),
    participant('bs-mock-1-p2', 'Jordan', 46.63, true),
    participant('bs-mock-1-p3', 'Sam', 46.63, false),
    participant('bs-mock-1-p4', 'Riley', 46.61, false),
  ]),
  buildSplit('bs-mock-2', 'Weekend cabin', 640, subDays(NOW, 9), [
    participant('bs-mock-2-p1', 'Morgan', 128, true),
    participant('bs-mock-2-p2', 'Casey', 128, false),
    participant('bs-mock-2-p3', 'Taylor', 128, false),
    participant('bs-mock-2-p4', 'Jamie', 128, false),
    participant('bs-mock-2-p5', 'Quinn', 128, false),
  ]),
  buildSplit('bs-mock-3', 'Office lunch run', 84, subDays(NOW, 14), [
    participant('bs-mock-3-p1', 'Priya', 21, true),
    participant('bs-mock-3-p2', 'Noah', 21, true),
    participant('bs-mock-3-p3', 'Elena', 21, true),
    participant('bs-mock-3-p4', 'Marcus', 21, true),
  ]),
  buildSplit('bs-mock-4', 'Concert tickets', 320, subMonths(NOW, 1), [
    participant('bs-mock-4-p1', 'Avery', 80, true),
    participant('bs-mock-4-p2', 'Blake', 80, false),
    participant('bs-mock-4-p3', 'Drew', 80, true),
    participant('bs-mock-4-p4', 'Skyler', 80, false),
  ]),
  buildSplit('bs-mock-5', 'Groceries — March', 142.75, subMonths(NOW, 2), [
    participant('bs-mock-5-p1', 'Chris', 35.69, true),
    participant('bs-mock-5-p2', 'Pat', 35.69, true),
    participant('bs-mock-5-p3', 'Lee', 35.69, false),
    participant('bs-mock-5-p4', 'Robin', 35.68, false),
  ]),
];
