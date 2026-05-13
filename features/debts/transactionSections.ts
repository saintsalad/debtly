import { format, parseISO } from 'date-fns';
import { Debt } from '@/features/debts/types';

export type TransactionSection = {
  key: string;
  title: string;
  data: Debt[];
};

export function buildTransactionSections(debts: Debt[]): TransactionSection[] {
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
