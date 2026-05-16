import { differenceInCalendarDays, format, isToday, isTomorrow, startOfDay } from 'date-fns';
import { getRemainingBalance, getTotalPaid } from '@/features/debts/debtCalculations';
import { Debt, DebtStatus } from '@/features/debts/types';

/** List-row due urgency for unpaid debts with a due date (and paid / no-date fallbacks). */
export type TransactionDuePresentationTone =
  | 'paid'
  | 'pending_no_due'
  | 'due_later'
  | 'due_within_week'
  | 'due_tomorrow'
  | 'due_today'
  | 'overdue';

export const CURRENCIES: Record<string, { symbol: string; label: string }> = {
  PHP: { symbol: '₱', label: 'Philippine Peso' },
  USD: { symbol: '$', label: 'US Dollar' },
  EUR: { symbol: '€', label: 'Euro' },
  GBP: { symbol: '£', label: 'British Pound' },
  JPY: { symbol: '¥', label: 'Japanese Yen' },
  SGD: { symbol: 'S$', label: 'Singapore Dollar' },
  AUD: { symbol: 'A$', label: 'Australian Dollar' },
  CAD: { symbol: 'C$', label: 'Canadian Dollar' },
};

export const formatCurrency = (amount: number, currency = 'PHP'): string => {
  const symbol = CURRENCIES[currency]?.symbol ?? currency;
  const abs = Math.abs(amount).toFixed(2);
  const [whole, cents] = abs.split('.');
  const formatted = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${symbol}${formatted}.${cents}`;
};

export const formatDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'MMM d, yyyy');
};

export const getComputedStatus = (debt: Debt): DebtStatus => {
  if (debt.status === 'paid' || getRemainingBalance(debt) <= 0.009) return 'paid';
  if (getTotalPaid(debt) > 0) return 'partial';
  if (debt.dueDate) {
    const due = startOfDay(new Date(debt.dueDate));
    const today = startOfDay(new Date());
    if (due < today) return 'overdue';
  }
  return 'pending';
};

/**
 * Copy + tone for transaction rows: emphasizes near/overdue dues without crowding paid items.
 */
export function getTransactionDuePresentation(debt: Debt): {
  tone: TransactionDuePresentationTone;
  label: string;
} {
  const computed = getComputedStatus(debt);
  if (computed === 'paid') {
    return { tone: 'paid', label: 'Paid' };
  }
  if (!debt.dueDate) {
    return {
      tone: 'pending_no_due',
      label: computed === 'partial' ? 'Partially paid' : 'Pending',
    };
  }

  const due = startOfDay(new Date(debt.dueDate));
  const today = startOfDay(new Date());
  const delta = differenceInCalendarDays(due, today);

  if (delta < 0) {
    return { tone: 'overdue', label: 'Overdue' };
  }
  if (delta === 0) {
    return { tone: 'due_today', label: 'Due today' };
  }
  if (delta === 1) {
    return { tone: 'due_tomorrow', label: 'Due tomorrow' };
  }
  if (delta <= 7) {
    return { tone: 'due_within_week', label: `Due in ${delta} days` };
  }
  return { tone: 'due_later', label: `Due ${formatDate(debt.dueDate)}` };
}

export const generateId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

export const getInitials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .map((n) => n[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);

const AVATAR_COLORS = [
  '#5B5BD6', '#E5484D', '#E54666', '#E93D82', '#8E4EC6',
  '#0090FF', '#00A2C7', '#12A594', '#46A758', '#F0C000',
  '#F76808', '#D4380D', '#B8341B',
];

export const getAvatarColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};
