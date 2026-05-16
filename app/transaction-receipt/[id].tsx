import React, { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TransactionReceiptScreen } from '@/features/debts/receipt/TransactionReceiptScreen';
import { useCurrency } from '@/hooks/useCurrency';
import { useDebtStore } from '@/stores/debtStore';

export default function TransactionReceiptRoute() {
  const router = useRouter();
  const { fmt } = useCurrency();
  const { id } = useLocalSearchParams<{ id: string }>();
  const debt = useDebtStore((state) => (id ? state.debts.find((d) => d.id === id) : undefined));

  useEffect(() => {
    if (id && !debt) {
      if (router.canGoBack()) {
        router.back();
      }
    }
  }, [id, debt, router]);

  if (!id || !debt) {
    return null;
  }

  return (
    <TransactionReceiptScreen
      debt={debt}
      fmt={fmt}
      onClose={() => {
        if (router.canGoBack()) {
          router.back();
        }
      }}
    />
  );
}
