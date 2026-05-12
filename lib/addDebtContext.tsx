import React, { createContext, useContext, useMemo } from 'react';
import { useRouter } from 'expo-router';

const AddDebtContext = createContext<{ present: () => void }>({ present: () => {} });

export function useAddDebt() {
  return useContext(AddDebtContext);
}

export function AddDebtProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const value = useMemo(
    () => ({
      present: () => {
        router.push('/add-transaction');
      },
    }),
    [router]
  );

  return <AddDebtContext.Provider value={value}>{children}</AddDebtContext.Provider>;
}
