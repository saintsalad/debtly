import React from 'react';
import { useRouter } from 'expo-router';
import { AddDebtScreen } from '@/features/debts/AddDebtScreen';

export default function AddTransactionRoute() {
  const router = useRouter();

  return <AddDebtScreen onClose={() => router.back()} />;
}
