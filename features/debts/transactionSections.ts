import { format, parseISO, startOfDay } from 'date-fns';
import { parseLocalDate } from '@/features/debts/dates';
import { Debt } from '@/features/debts/types';
import { filterActiveDebts, filterScheduledDebts } from '@/features/debts/transactionList';

export type TransactionDueMonthTier = 'current' | 'future' | 'past';

export type TransactionSection = {
  key: string;
  title: string;
  data: Debt[];
  /** Populated for month-grouped ledger sections (scheduled block omits). */
  dueMonthTier?: TransactionDueMonthTier;
  isScheduled?: boolean;
};

export type BuildTransactionSectionsOptions = {
  /** Reference “today” for the current month tier (defaults to `new Date()`). */
  asOf?: Date;
};

/** Month bucket for list sections: prefers due date (instalments, loans) over created-at stamp. */
function sectionMonthKey(debt: Debt): string {
  if (debt.dueDate) {
    return format(parseLocalDate(debt.dueDate), 'yyyy-MM');
  }
  return format(parseISO(debt.createdAt), 'yyyy-MM');
}

function calendarMonthKeyFromDate(asOf: Date): string {
  return format(startOfDay(asOf), 'yyyy-MM');
}

/** 0 = dues this calendar month, 1 = future month, 2 = past month */
function monthTier(monthKey: string, currentMonthKey: string): 0 | 1 | 2 {
  if (monthKey === currentMonthKey) return 0;
  if (monthKey > currentMonthKey) return 1;
  return 2;
}

/**
 * 1. Current calendar month with dues  
 * 2. Future months (soonest first)  
 * 3. Past months (most recent past first)
 */
function compareMonthSectionOrder(
  monthKeyA: string,
  monthKeyB: string,
  currentMonthKey: string
): number {
  const tierA = monthTier(monthKeyA, currentMonthKey);
  const tierB = monthTier(monthKeyB, currentMonthKey);
  if (tierA !== tierB) return tierA - tierB;
  if (tierA === 1) return monthKeyA.localeCompare(monthKeyB);
  if (tierA === 2) return monthKeyB.localeCompare(monthKeyA);
  return monthKeyA.localeCompare(monthKeyB);
}

function groupByMonth(debts: Debt[], asOf: Date): TransactionSection[] {
  const groups = new Map<string, Debt[]>();
  const currentMonthKey = calendarMonthKeyFromDate(asOf);

  for (const debt of debts) {
    const key = sectionMonthKey(debt);
    const current = groups.get(key);
    if (current) current.push(debt);
    else groups.set(key, [debt]);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => compareMonthSectionOrder(left, right, currentMonthKey))
    .map(([key, data]) => {
      const t = monthTier(key, currentMonthKey);
      const dueMonthTier: TransactionDueMonthTier = t === 0 ? 'current' : t === 1 ? 'future' : 'past';

      return {
        key,
        title: format(parseISO(`${key}-01`), 'MMMM yyyy'),
        data,
        dueMonthTier,
      };
    });
}

export function buildTransactionSections(
  debts: Debt[],
  options?: BuildTransactionSectionsOptions
): TransactionSection[] {
  const asOf = options?.asOf ?? new Date();
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

  sections.push(...groupByMonth(active, asOf));

  return sections;
}
