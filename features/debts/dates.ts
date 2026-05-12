import {
  addMonths,
  addWeeks,
  addYears,
  format,
  getDate,
  getDaysInMonth,
  isAfter,
  isBefore,
  parseISO,
  setDate,
  startOfDay,
} from 'date-fns';
import { RecurrenceFrequency } from '@/features/debts/types';

export type LocalDateString = string;

export function toLocalDateString(value: Date | string): LocalDateString {
  const date = typeof value === 'string' ? parseISO(value) : value;
  return format(startOfDay(date), 'yyyy-MM-dd');
}

export function parseLocalDate(value: LocalDateString | string): Date {
  return startOfDay(parseISO(value));
}

export function isOverdueDate(dueDate: LocalDateString, asOf = new Date()): boolean {
  return isBefore(parseLocalDate(dueDate), startOfDay(asOf));
}

export function isOnOrBefore(asOf: Date, boundary: Date): boolean {
  return !isAfter(startOfDay(asOf), startOfDay(boundary));
}

export function advanceRecurringDueDate(
  anchorDate: LocalDateString,
  currentDueDate: LocalDateString,
  interval: RecurrenceFrequency
): LocalDateString {
  const anchorDay = getDate(parseLocalDate(anchorDate));
  const current = parseLocalDate(currentDueDate);

  if (interval === 'weekly') {
    return toLocalDateString(addWeeks(current, 1));
  }

  if (interval === 'yearly') {
    const next = addYears(current, 1);
    const lastDay = getDaysInMonth(next);
    return toLocalDateString(setDate(next, Math.min(anchorDay, lastDay)));
  }

  const next = addMonths(current, 1);
  const lastDay = getDaysInMonth(next);
  return toLocalDateString(setDate(next, Math.min(anchorDay, lastDay)));
}

export function countAccrualPeriods(
  startDate: LocalDateString,
  endDate: LocalDateString,
  frequency: 'monthly' | 'yearly'
): number {
  if (isBefore(parseLocalDate(endDate), parseLocalDate(startDate))) return 0;

  let periods = 0;
  let cursor = parseLocalDate(startDate);

  while (true) {
    const next =
      frequency === 'monthly' ? addMonths(cursor, 1) : addYears(cursor, 1);
    if (isAfter(startOfDay(next), parseLocalDate(endDate))) break;
    periods += 1;
    cursor = next;
  }

  return periods;
}
