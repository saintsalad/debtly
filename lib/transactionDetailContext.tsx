import React, { createContext, useContext, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Debt } from '@/features/debts/types';

const TransactionDetailContext = createContext<{ open: (debt: Debt) => void }>({
  open: () => {},
});

export function useTransactionDetail() {
  return useContext(TransactionDetailContext);
}

export function TransactionDetailProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const value = useMemo(
    () => ({
      open: (debt: Debt) => {
        router.push({
          pathname: '/transaction/[id]',
          params: { id: debt.id },
        });
      },
    }),
    [router]
  );

  return (
    <TransactionDetailContext.Provider value={value}>{children}</TransactionDetailContext.Provider>
  );
}
