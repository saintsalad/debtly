import {
  endOfMonth,
  endOfWeek,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { Debt, DebtStatus } from '@/features/debts/types';
import { getComputedStatus } from '@/lib/utils';

export type DueDateFilter =
  | 'all'
  | 'overdue'
  | 'due_this_week'
  | 'due_this_month'
  | 'no_due_date';

export type TransactionFilters = {
  statuses: DebtStatus[];
  dueDate: DueDateFilter;
};

export const DEFAULT_TRANSACTION_FILTERS: TransactionFilters = {
  statuses: [],
  dueDate: 'all',
};

export function hasActiveTransactionFilters(filters: TransactionFilters): boolean {
  return filters.statuses.length > 0 || filters.dueDate !== 'all';
}

function matchesDueDateFilter(debt: Debt, dueDate: DueDateFilter, today = new Date()): boolean {
  if (dueDate === 'all') return true;
  if (dueDate === 'no_due_date') return !debt.dueDate;

  if (!debt.dueDate) return false;

  const due = startOfDay(new Date(debt.dueDate));
  const now = startOfDay(today);

  if (dueDate === 'overdue') {
    return getComputedStatus(debt) === 'overdue';
  }

  if (dueDate === 'due_this_week') {
    return isWithinInterval(due, {
      start: startOfWeek(now, { weekStartsOn: 1 }),
      end: endOfWeek(now, { weekStartsOn: 1 }),
    });
  }

  return isWithinInterval(due, {
    start: startOfMonth(now),
    end: endOfMonth(now),
  });
}

export function applyTransactionFilters(
  debts: Debt[],
  filters: TransactionFilters,
  today = new Date()
): Debt[] {
  const selectedStatuses = new Set(filters.statuses);

  return debts.filter((debt) => {
    if (selectedStatuses.size > 0 && !selectedStatuses.has(getComputedStatus(debt))) {
      return false;
    }

    return matchesDueDateFilter(debt, filters.dueDate, today);
  });
}
