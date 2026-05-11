import { useProfileStore } from '@/stores/profileStore';
import { formatCurrency } from '@/lib/utils';

export const useCurrency = () => {
  const currency = useProfileStore((s) => s.currency);
  return {
    currency,
    fmt: (amount: number) => formatCurrency(amount, currency),
  };
};
