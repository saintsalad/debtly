import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Debt, AddDebtInput } from '@/features/debts/types';
import { zustandStorage } from '@/lib/storage';
import { generateId } from '@/lib/utils';
import { INITIAL_DEBTS } from '@/lib/mockData';

interface DebtState {
  debts: Debt[];
  addDebt: (input: AddDebtInput) => void;
  updateDebt: (id: string, updates: Partial<Debt>) => void;
  deleteDebt: (id: string) => void;
  markPaid: (id: string) => void;
  clearAll: () => void;
}

export const useDebtStore = create<DebtState>()(
  persist(
    (set) => ({
      debts: INITIAL_DEBTS,
      addDebt: (input) => {
        const now = new Date().toISOString();
        const debt: Debt = {
          ...input,
          id: generateId(),
          status: 'pending',
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ debts: [debt, ...state.debts] }));
      },
      updateDebt: (id, updates) =>
        set((state) => ({
          debts: state.debts.map((d) =>
            d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d
          ),
        })),
      deleteDebt: (id) =>
        set((state) => ({ debts: state.debts.filter((d) => d.id !== id) })),
      markPaid: (id) =>
        set((state) => ({
          debts: state.debts.map((d) =>
            d.id === id ? { ...d, status: 'paid', updatedAt: new Date().toISOString() } : d
          ),
        })),
      clearAll: () => set({ debts: [] }),
    }),
    {
      name: 'debtly-debts',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);

export const useDebtSummary = () => {
  const debts = useDebtStore((s) => s.debts);
  const owedToMe = debts.filter((d) => d.type === 'owed_to_me' && d.status === 'pending');
  const iOwe = debts.filter((d) => d.type === 'i_owe' && d.status === 'pending');
  return {
    debts,
    owedToMe,
    iOwe,
    totalOwedToMe: owedToMe.reduce((s, d) => s + d.amount, 0),
    totalIOwe: iOwe.reduce((s, d) => s + d.amount, 0),
    settledCount: debts.filter((d) => d.status === 'paid').length,
  };
};
