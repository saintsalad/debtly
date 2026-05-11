import { useProfileStore } from '@/stores/profileStore';
import { formatCurrency, CURRENCIES } from '@/lib/utils';

export const useCurrency = () => {
  const currency = useProfileStore((s) => s.currency);
  const symbol = CURRENCIES[currency]?.symbol ?? currency;
  return {
    currency,
    symbol,
    fmt: (amount: number) => formatCurrency(amount, currency),
  };
};
