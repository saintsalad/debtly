import { format, parseISO } from 'date-fns';
import type {
  ActivityItem,
  GroupExpense,
  Settlement,
  SplitGroup,
} from '@/features/group-expense/types';
import { getCurrentUserMember } from '@/features/group-expense/balanceEngine';

function memberName(group: SplitGroup, memberId?: string): string {
  if (!memberId) return 'Someone';
  const member = group.members.find((m) => m.id === memberId);
  return member?.displayName ?? 'Someone';
}

function actorLabel(group: SplitGroup, actorMemberId?: string): string {
  const current = getCurrentUserMember(group.members);
  if (actorMemberId && current && actorMemberId === current.id) return 'You';
  return memberName(group, actorMemberId);
}

function splitMethodLabel(method: GroupExpense['splitMethod']): string {
  switch (method) {
    case 'exact':
      return 'Custom split';
    case 'percentage':
      return 'Percent split';
    default:
      return 'Equal split';
  }
}

export function buildGroupActivity(
  group: SplitGroup,
  expenses: GroupExpense[],
  settlements: Settlement[]
): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const expense of expenses) {
    if (expense.groupId !== group.id) continue;
    const payerName = memberName(group, expense.paidByMemberId);
    const actor = actorLabel(group, expense.paidByMemberId);

    if (expense.deletedAt) {
      items.push({
        id: `del-${expense.id}`,
        groupId: group.id,
        kind: 'expense_deleted',
        at: expense.deletedAt,
        expenseId: expense.id,
        title: `${actor} deleted ${expense.title}`,
        amountMinor: expense.amountMinor,
      });
      continue;
    }

    const isEdit = expense.updatedAt !== expense.createdAt;
    const paidByYou = actor === 'You';
    items.push({
      id: `exp-${expense.id}-${isEdit ? 'edit' : 'add'}`,
      groupId: group.id,
      kind: isEdit ? 'expense_edited' : 'expense_added',
      at: isEdit ? expense.updatedAt : expense.createdAt,
      actorMemberId: expense.paidByMemberId,
      expenseId: expense.id,
      title: expense.title,
      subtitle: `${paidByYou ? 'You paid' : `Paid by ${payerName}`} · ${splitMethodLabel(expense.splitMethod)}`,
      amountMinor: expense.amountMinor,
    });
  }

  for (const settlement of settlements) {
    if (settlement.groupId !== group.id) continue;
    const from = actorLabel(group, settlement.fromMemberId);
    const to = memberName(group, settlement.toMemberId);
    items.push({
      id: `set-${settlement.id}`,
      groupId: group.id,
      kind: 'settlement_recorded',
      at: settlement.settledAt,
      settlementId: settlement.id,
      actorMemberId: settlement.fromMemberId,
      title: `${from} settled with ${to}`,
      amountMinor: settlement.amountMinor,
    });
  }

  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export function filterActivity(
  items: ActivityItem[],
  options: {
    search?: string;
    memberId?: string;
    unpaidOnly?: boolean;
    expenseIdsWithBalance?: Set<string>;
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
        item.kind === 'settlement_recorded'
    );
  }
  if (options.unpaidOnly && options.expenseIdsWithBalance) {
    list = list.filter(
      (item) =>
        item.expenseId != null && options.expenseIdsWithBalance!.has(item.expenseId)
    );
  }
  return list;
}

export function formatActivityDate(iso: string): string {
  return format(parseISO(iso), 'MMM d, yyyy · h:mm a');
}
