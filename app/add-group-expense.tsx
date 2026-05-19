import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AddExpenseScreen } from '@/features/group-expense/AddExpenseScreen';

export default function AddGroupExpenseRoute() {
  const router = useRouter();
  const { groupId, expenseId } = useLocalSearchParams<{
    groupId: string;
    expenseId?: string;
  }>();

  if (!groupId) {
    return null;
  }

  return (
    <AddExpenseScreen
      groupId={groupId}
      expenseId={typeof expenseId === 'string' ? expenseId : undefined}
      onClose={() => router.back()}
    />
  );
}
