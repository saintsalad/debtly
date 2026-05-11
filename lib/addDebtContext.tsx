import React, { createContext, useContext, useRef } from 'react';
import { AddDebtSheet, type AddDebtSheetHandle } from '@/features/debts/AddDebtSheet';

const AddDebtContext = createContext<{ present: () => void }>({ present: () => {} });

export function useAddDebt() {
  return useContext(AddDebtContext);
}

export function AddDebtProvider({ children }: { children: React.ReactNode }) {
  const sheetRef = useRef<AddDebtSheetHandle>(null);

  return (
    <AddDebtContext.Provider value={{ present: () => sheetRef.current?.present() }}>
      {children}
      <AddDebtSheet ref={sheetRef} />
    </AddDebtContext.Provider>
  );
}
