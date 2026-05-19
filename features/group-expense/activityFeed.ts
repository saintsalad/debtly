import { format, parseISO } from 'date-fns';
import { buildGroupActivityFeed } from '@/features/group-expense/activityLog';
import type {
  ActivityItem,
  ActivityLogEntry,
  GroupExpense,
  Settlement,
  SplitGroup,
} from '@/features/group-expense/types';

export { actorLabel, auditActorName } from '@/features/group-expense/activityLog';

export function buildGroupActivity(
  group: SplitGroup,
  activityLog: ActivityLogEntry[],
  _expenses?: GroupExpense[],
  _settlements?: Settlement[]
): ActivityItem[] {
  return buildGroupActivityFeed(group.id, activityLog);
}

export function filterActivity(
  items: ActivityItem[],
  options: {
    search?: string;
    memberId?: string;
  }
): ActivityItem[] {
  let list = items;
  if (options.search?.trim()) {
    const q = options.search.toLowerCase();
    list = list.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle?.toLowerCase().includes(q)
    );
  }
  if (options.memberId) {
    list = list.filter(
      (item) =>
        item.actorMemberId === options.memberId ||
        item.targetMemberId === options.memberId
    );
  }
  return list;
}

export function formatActivityDate(iso: string): string {
  return format(parseISO(iso), 'MMM d, yyyy · h:mm a');
}
