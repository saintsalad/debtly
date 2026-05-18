import React, { useEffect, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { buildGroupSplitReceiptData } from '@/features/group-expense/groupReceiptData';
import { PrintedReceiptShareScreen } from '@/features/debts/receipt/PrintedReceiptShareScreen';
import { useCurrency } from '@/hooks/useCurrency';
import { useGroupExpenseStore } from '@/stores/groupExpenseStore';
import { useProfileStore } from '@/stores/profileStore';

export default function GroupReceiptRoute() {
  const router = useRouter();
  const { fmt } = useCurrency();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const profileName = useProfileStore((s) => s.name);
  const group = useGroupExpenseStore((s) => (id ? s.getGroup(id) : undefined));
  const expenses = useGroupExpenseStore((s) => s.expenses);
  const settlements = useGroupExpenseStore((s) => s.settlements);

  useEffect(() => {
    if (id && !group && router.canGoBack()) router.back();
  }, [id, group, router]);

  const receiptData = useMemo(() => {
    if (!group || !id) return null;
    return buildGroupSplitReceiptData(group, expenses, settlements, fmt, new Date(), profileName);
  }, [group, id, expenses, settlements, fmt, profileName]);

  if (!id || !group || !receiptData) {
    return null;
  }

  return (
    <PrintedReceiptShareScreen
      receiptData={receiptData}
      tiltSeed={group.id}
      screenTitle="Group receipt"
      onClose={() => {
        if (router.canGoBack()) router.back();
      }}
    />
  );
}
