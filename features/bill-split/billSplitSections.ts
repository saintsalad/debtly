import { format, parseISO } from 'date-fns';
import { BillSplit } from '@/features/bill-split/types';

export type BillSplitSection = {
  key: string;
  title: string;
  data: BillSplit[];
};

export function buildBillSplitSections(splits: BillSplit[]): BillSplitSection[] {
  const groups = new Map<string, BillSplit[]>();

  for (const split of splits) {
    const key = format(new Date(split.createdAt), 'yyyy-MM');
    const current = groups.get(key);
    if (current) current.push(split);
    else groups.set(key, [split]);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([key, data]) => ({
      key,
      title: format(parseISO(`${key}-01`), 'MMMM yyyy'),
      data,
    }));
}

export function isBillSplitSettled(split: BillSplit): boolean {
  return split.participants.length > 0 && split.participants.every((p) => p.paid);
}
