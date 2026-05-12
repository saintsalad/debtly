import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AddDebtScreen } from '@/features/debts/AddDebtScreen';

export default function EditTransactionRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) {
    return null;
  }

  return <AddDebtScreen debtId={id} onClose={() => router.back()} />;
}
