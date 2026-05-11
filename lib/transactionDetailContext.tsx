import React, { createContext, useContext, useMemo, useRef } from 'react';
import {
  TransactionDetailSheet,
  type TransactionDetailSheetHandle,
} from '@/features/debts/TransactionDetailSheet';
import { Debt } from '@/features/debts/types';

const TransactionDetailContext = createContext<{ open: (debt: Debt) => void }>({
  open: () => {},
});

export function useTransactionDetail() {
  return useContext(TransactionDetailContext);
}

export function TransactionDetailProvider({ children }: { children: React.ReactNode }) {
  const sheetRef = useRef<TransactionDetailSheetHandle>(null);

  const value = useMemo(
    () => ({
      open: (debt: Debt) => {
        sheetRef.current?.present(debt);
      },
    }),
    []
  );

  return (
    <TransactionDetailContext.Provider value={value}>
      {children}
      <TransactionDetailSheet ref={sheetRef} />
    </TransactionDetailContext.Provider>
  );
}
