import { differenceInCalendarDays, parseISO, startOfDay, startOfWeek, subWeeks } from 'date-fns';

/**
 * Ledger activity timelines use the device **local calendar** (via `Date` getters and
 * {@link parseLocalDate} / {@link parseToLocalDayKey}). Weekly streak buckets are **Monday-based**
 * ISO-style weeks ({@link startOfWeek} `{ weekStartsOn: 1 }`), not Gregorian month boundaries.
 */

import type { Debt } from '@/features/debts/types';
import { parseLocalDate, toLocalDateString } from '@/features/debts/dates';

/** Monday 00:00 local for the calendar week containing `day` (weekStartsOn Monday, matches ISO weekdays). */
function mondayWeekStart(day: Date): Date {
  return startOfWeek(startOfDay(day), { weekStartsOn: 1 });
}

/** Local calendar yyyy-MM-dd for any ISO-ish saved string (`createdAt` / `paidAt`). */
export function parseToLocalDayKey(iso: string): string {
  return toLocalDateString(parseISO(iso));
}

/**
 * Collects distinct local dates with activity: new entry (`createdAt`) or a payment (`paidAt`).
 */
export function collectActivityDayKeys(debts: Debt[]): Set<string> {
  const keys = new Set<string>();
  for (const d of debts) {
    keys.add(parseToLocalDayKey(d.createdAt));
    for (const p of d.payments ?? []) {
      keys.add(parseToLocalDayKey(p.paidAt));
    }
  }
  return keys;
}

export function longestDailyStreak(activityDayKeys: Set<string>): number {
  if (activityDayKeys.size === 0) return 0;
  const sorted = [...activityDayKeys].sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const key of sorted) {
    const day = parseLocalDate(key);
    if (!prev) {
      run = 1;
    } else {
      const gap = differenceInCalendarDays(day, prev);
      run = gap === 1 ? run + 1 : 1;
    }
    prev = day;
    best = Math.max(best, run);
  }
  return best;
}

function collectWeekStartTimes(activityDayKeys: Set<string>): Set<number> {
  const set = new Set<number>();
  for (const key of activityDayKeys) {
    set.add(mondayWeekStart(parseLocalDate(key)).getTime());
  }
  return set;
}

/** Consecutive Monday-based weeks ending at `asOfDate`'s week; 0 if that week has no activity. */
export function currentWeeklyStreak(
  activityDayKeys: Set<string>,
  asOfDate: Date = new Date()
): number {
  const weekStarts = collectWeekStartTimes(activityDayKeys);
  let cursor = mondayWeekStart(asOfDate);
  if (!weekStarts.has(cursor.getTime())) return 0;
  let n = 1;
  while (true) {
    const prevMonday = subWeeks(cursor, 1);
    if (!weekStarts.has(prevMonday.getTime())) break;
    n++;
    cursor = prevMonday;
  }
  return n;
}

export function longestWeeklyStreak(activityDayKeys: Set<string>): number {
  const starts = [...collectWeekStartTimes(activityDayKeys)].sort((a, b) => a - b);
  if (starts.length === 0) return 0;

  let best = 1;
  let run = 1;
  for (let i = 1; i < starts.length; i++) {
    const prev = starts[i - 1]!;
    const cur = starts[i]!;
    const gap = differenceInCalendarDays(new Date(cur), new Date(prev));
    run = gap === 7 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

export function monthlyEntryCountsCreatedInYear(debts: Debt[], year: number): number[] {
  const counts = Array.from({ length: 12 }, () => 0);
  for (const d of debts) {
    const dt = parseISO(d.createdAt);
    if (dt.getFullYear() === year) {
      counts[dt.getMonth()] += 1;
    }
  }
  return counts;
}

export function countEntriesCreatedThisYear(debts: Debt[], year: number): number {
  return debts.filter((d) => parseISO(d.createdAt).getFullYear() === year).length;
}

/** Distinct activity days whose local year is `year`. */
export function countActiveDaysThisYear(activityDayKeys: Set<string>, year: number): number {
  let n = 0;
  for (const key of activityDayKeys) {
    const dt = parseLocalDate(key);
    if (dt.getFullYear() === year) n++;
  }
  return n;
}

export function countPaymentsInYear(debts: Debt[], year: number): number {
  let n = 0;
  for (const d of debts) {
    for (const p of d.payments ?? []) {
      if (parseISO(p.paidAt).getFullYear() === year) n++;
    }
  }
  return n;
}

/** Sum of all payment amounts (minor units) recorded in `year`. */
export function totalPaidMinorInYear(debts: Debt[], year: number): number {
  let sum = 0;
  for (const d of debts) {
    for (const p of d.payments ?? []) {
      if (parseISO(p.paidAt).getFullYear() === year) {
        sum += p.amountMinor;
      }
    }
  }
  return sum;
}

/**
 * Format a number in compact form for display:
 * - <1000: as-is
 * - 1k–999k: "Xk" or "X.Xk"
 * - 1M+: "XM" or "X.XM"
 * Appends "+" when digits are truncated.
 */
export function formatCompactNumber(value: number): string {
  if (value < 1000) return String(value);
  if (value < 1_000_000) {
    const k = value / 1000;
    const rounded = Math.floor(k * 10) / 10;
    const display = rounded % 1 === 0 ? String(Math.floor(rounded)) : rounded.toFixed(1);
    const hasMore = value > rounded * 1000;
    return `${display}k${hasMore ? '+' : ''}`;
  }
  const m = value / 1_000_000;
  const rounded = Math.floor(m * 10) / 10;
  const display = rounded % 1 === 0 ? String(Math.floor(rounded)) : rounded.toFixed(1);
  const hasMore = value > rounded * 1_000_000;
  return `${display}M${hasMore ? '+' : ''}`;
}

/** Unique counterparties with non-empty trimmed `personName`. */
export function uniqueCounterpartyCount(debts: Debt[]): number {
  const names = new Set<string>();
  for (const d of debts) {
    const name = d.personName.trim();
    if (name) names.add(name);
  }
  return names.size;
}

export interface TransactionInsights {
  calendarYear: number;
  entriesThisYear: number;
  monthlyEntryCounts: number[];
  activityDayKeys: Set<string>;
  currentWeeklyStreak: number;
  longestDailyStreak: number;
  longestWeeklyStreak: number;
  activeDaysThisYear: number;
  uniquePeople: number;
  paymentsRecordedThisYear: number;
  /** Sum of all payment amounts (minor units) in the calendar year. */
  totalPaidMinorThisYear: number;
}

export function buildTransactionInsights(
  debts: Debt[],
  options?: { now?: Date }
): TransactionInsights {
  const now = options?.now ?? new Date();
  const calendarYear = now.getFullYear();
  const activityDayKeys = collectActivityDayKeys(debts);

  return {
    calendarYear,
    entriesThisYear: countEntriesCreatedThisYear(debts, calendarYear),
    monthlyEntryCounts: monthlyEntryCountsCreatedInYear(debts, calendarYear),
    activityDayKeys,
    currentWeeklyStreak: currentWeeklyStreak(activityDayKeys, now),
    longestDailyStreak: longestDailyStreak(activityDayKeys),
    longestWeeklyStreak: longestWeeklyStreak(activityDayKeys),
    activeDaysThisYear: countActiveDaysThisYear(activityDayKeys, calendarYear),
    uniquePeople: uniqueCounterpartyCount(debts),
    paymentsRecordedThisYear: countPaymentsInYear(debts, calendarYear),
    totalPaidMinorThisYear: totalPaidMinorInYear(debts, calendarYear),
  };
}

export interface GroupExpenseInsights {
  calendarYear: number;
  /** Total number of active groups. */
  totalGroups: number;
  /** Groups created this calendar year. */
  groupsCreatedThisYear: number;
  /** Expenses recorded this calendar year. */
  expensesThisYear: number;
  /** Sum of all expense amounts (minor units) this year. */
  totalSpentMinorThisYear: number;
  /** Settlements recorded this calendar year. */
  settlementsThisYear: number;
  /** Sum of all settlement amounts (minor units) this year. */
  totalSettledMinorThisYear: number;
}

export interface GroupExpenseData {
  groups: Array<{ id: string; createdAt: string }>;
  expenses: Array<{ id: string; amountMinor: number; expenseDate: string; deletedAt?: string }>;
  settlements: Array<{ id: string; amountMinor: number; settledAt: string }>;
}

export function buildGroupExpenseInsights(
  data: GroupExpenseData,
  options?: { now?: Date }
): GroupExpenseInsights {
  const now = options?.now ?? new Date();
  const calendarYear = now.getFullYear();

  const activeExpenses = data.expenses.filter((e) => !e.deletedAt);

  const groupsCreatedThisYear = data.groups.filter(
    (g) => parseISO(g.createdAt).getFullYear() === calendarYear
  ).length;

  const expensesThisYear = activeExpenses.filter(
    (e) => parseISO(e.expenseDate).getFullYear() === calendarYear
  );

  const settlementsThisYear = data.settlements.filter(
    (s) => parseISO(s.settledAt).getFullYear() === calendarYear
  );

  return {
    calendarYear,
    totalGroups: data.groups.length,
    groupsCreatedThisYear,
    expensesThisYear: expensesThisYear.length,
    totalSpentMinorThisYear: expensesThisYear.reduce((sum, e) => sum + e.amountMinor, 0),
    settlementsThisYear: settlementsThisYear.length,
    totalSettledMinorThisYear: settlementsThisYear.reduce((sum, s) => sum + s.amountMinor, 0),
  };
}
