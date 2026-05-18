import { useProfileStore } from '@/stores/profileStore';
import { formatCurrency, getCurrencyMeta } from '@/lib/utils';

export const useCurrency = () => {
  const currency = useProfileStore((s) => s.currency);
  const symbol = getCurrencyMeta(currency).symbol;
  return {
    currency,
    symbol,
    fmt: (amount: number) => formatCurrency(amount, currency),
  };
};
