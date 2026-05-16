import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TransactionDetailScreen } from '@/features/debts/TransactionDetailScreen';

export default function TransactionDetailRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) {
    return null;
  }

  return (
    <TransactionDetailScreen
      debtId={id}
      onClose={() => {
        if (router.canGoBack()) {
          router.back();
        }
      }}
    />
  );
}
