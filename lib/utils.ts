import { format, isToday, isTomorrow, startOfDay } from 'date-fns';
import { getRemainingBalance, getTotalPaid } from '@/features/debts/debtCalculations';
import { Debt, DebtStatus } from '@/features/debts/types';

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
