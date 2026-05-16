import { format, parseISO } from 'date-fns';
import { Debt } from '@/features/debts/types';
import { filterActiveDebts, filterScheduledDebts } from '@/features/debts/transactionList';

export type TransactionSection = {
  key: string;
  title: string;
  data: Debt[];
  isScheduled?: boolean;
};

function groupByMonth(debts: Debt[]): TransactionSection[] {
  const groups = new Map<string, Debt[]>();

  for (const debt of debts) {
    const key = format(new Date(debt.createdAt), 'yyyy-MM');
    const current = groups.get(key);
    if (current) current.push(debt);
    else groups.set(key, [debt]);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([key, data]) => ({
      key,
      title: format(parseISO(`${key}-01`), 'MMMM yyyy'),
      data,
    }));
}

export function buildTransactionSections(debts: Debt[]): TransactionSection[] {
  const scheduled = filterScheduledDebts(debts);
  const active = filterActiveDebts(debts);

  const sections: TransactionSection[] = [];

  if (scheduled.length > 0) {
    sections.push({
      key: '__scheduled__',
      title: 'Scheduled',
      data: scheduled,
      isScheduled: true,
    });
  }

  sections.push(...groupByMonth(active));

  return sections;
}
