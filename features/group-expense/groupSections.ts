import { format, parseISO } from 'date-fns';
import type { SplitGroup } from '@/features/group-expense/types';
import type { GroupExpense, Settlement } from '@/features/group-expense/types';
export type GroupSection = {
  key: string;
  title: string;
  data: SplitGroup[];
};

export function buildGroupSections(
  groups: SplitGroup[],
  expenses: GroupExpense[],
  settlements: Settlement[]
): GroupSection[] {
  const monthGroups = new Map<string, SplitGroup[]>();

  const sorted = [...groups].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  for (const group of sorted) {
    const key = format(new Date(group.updatedAt), 'yyyy-MM');
    const current = monthGroups.get(key);
    if (current) current.push(group);
    else monthGroups.set(key, [group]);
  }

  return [...monthGroups.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([key, data]) => ({
      key,
      title: format(parseISO(`${key}-01`), 'MMMM yyyy'),
      data,
    }));
}

export function filterGroups(groups: SplitGroup[], search?: string): SplitGroup[] {
  if (!search?.trim()) return [...groups];

  const q = search.toLowerCase();
  return groups.filter(
    (g) =>
      g.name.toLowerCase().includes(q) ||
      g.members.some((m) => m.displayName.toLowerCase().includes(q))
  );
}
