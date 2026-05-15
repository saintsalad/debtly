import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Debt, AddDebtInput, RecordPaymentInput } from '@/features/debts/types';
import {
  buildGroupSyncedDebt,
  computeGroupDebtTargets,
  isGroupSyncedDebt,
} from '@/features/group-expense/groupDebtSync';
import type { GroupExpense, Settlement, SplitGroup } from '@/features/group-expense/types';
import {
  createDebtFromInput,
  getRemainingBalance,
  validateAddDebtInput,
} from '@/features/debts/debtCalculations';
import {
  createPaymentRecord,
  settleDebtLedger,
  syncDebtLedger,
} from '@/features/debts/debtLedger';
import { migrateDebts } from '@/features/debts/debtMigration';
import {
  buildNextRecurringCycle,
  canGenerateNextRecurringCycle,
  stampRecurringGeneration,
} from '@/features/debts/recurringEngine';
import { zustandStorage } from '@/lib/storage';
import { INITIAL_DEBTS } from '@/lib/mocks/initialDebts';

interface DebtState {
  debts: Debt[];
  addDebt: (input: AddDebtInput) => string | null;
  updateDebt: (id: string, updates: Partial<Debt>) => void;
  deleteDebt: (id: string) => void;
  recordPayment: (id: string, input: RecordPaymentInput) => string | null;
  deletePayment: (debtId: string, paymentId: string) => void;
  markPaid: (id: string) => void;
  clearAll: () => void;
  syncGroupDebtsToLedger: (
    group: SplitGroup,
    expenses: GroupExpense[],
    settlements: Settlement[]
  ) => void;
  removeGroupSyncedDebtsForGroup: (groupId: string) => void;
}

function settleDebtWithLifecycle(debts: Debt[], debt: Debt, settledAt: string): Debt[] {
  const settled = settleDebtLedger(debt, settledAt);
  const stamped = stampRecurringGeneration(settled, settledAt);
  const nextCycle = canGenerateNextRecurringCycle(debts, stamped)
    ? buildNextRecurringCycle(stamped, settledAt)
    : null;

  return nextCycle ? [stamped, nextCycle] : [stamped];
}

function withSyncedDebts(debts: Debt[]): Debt[] {
  return debts.map((debt) => syncDebtLedger(debt));
}

export const useDebtStore = create<DebtState>()(
  persist(
    (set, get) => ({
      debts: INITIAL_DEBTS,
      addDebt: (input) => {
        const validationError = validateAddDebtInput(input);
        if (validationError) return validationError;

        const now = new Date().toISOString();
        const debt = createDebtFromInput(input, now);
        set((state) => ({ debts: [debt, ...withSyncedDebts(state.debts)] }));
        return null;
      },
      updateDebt: (id, updates) =>
        set((state) => ({
          debts: withSyncedDebts(
            state.debts.map((debt) =>
              debt.id === id
                ? syncDebtLedger({ ...debt, ...updates, updatedAt: new Date().toISOString() })
                : debt
            )
          ),
        })),
      deleteDebt: (id) =>
        set((state) => ({ debts: state.debts.filter((debt) => debt.id !== id) })),
      recordPayment: (id, input) => {
        const debt = get().debts.find((item) => item.id === id);
        if (!debt) return 'Debt not found.';
        if (debt.status === 'paid') return 'This debt is already settled.';

        const remaining = getRemainingBalance(debt);
        if (input.amount <= 0) return 'Enter a payment greater than 0.';
        if (input.amount > remaining + 0.009) {
          return `Enter up to ${remaining.toFixed(2)}.`;
        }

        const now = new Date().toISOString();
        const payment = createPaymentRecord(debt, input.amount, now, input.note);
        const withPayment: Debt = {
          ...debt,
          payments: [...(debt.payments ?? []), payment],
          updatedAt: now,
        };
        const synced = syncDebtLedger(withPayment, new Date(now));

        set((state) => ({
          debts: withSyncedDebts(
            state.debts.flatMap((item) => {
              if (item.id !== id) return [item];
              if (synced.status === 'paid') {
                return settleDebtWithLifecycle(
                  state.debts.filter((candidate) => candidate.id !== id),
                  synced,
                  now
                );
              }
              return [synced];
            })
          ),
        }));

        return null;
      },
      deletePayment: (debtId, paymentId) =>
        set((state) => ({
          debts: withSyncedDebts(
            state.debts.map((debt) => {
              if (debt.id !== debtId) return debt;
              const payments = (debt.payments ?? []).filter((payment) => payment.id !== paymentId);
              return syncDebtLedger({
                ...debt,
                status: 'pending',
                paidAt: undefined,
                accruedInterestMinor: undefined,
                payments,
                updatedAt: new Date().toISOString(),
              });
            })
          ),
        })),
      markPaid: (id) =>
        set((state) => {
          const now = new Date().toISOString();

          return {
            debts: withSyncedDebts(
              state.debts.flatMap((debt) => {
                if (debt.id !== id) return [debt];
                if (debt.status === 'paid') return [debt];

                const remaining = getRemainingBalance(debt);
                const withPayment =
                  remaining > 0.009
                    ? syncDebtLedger(
                        {
                          ...debt,
                          payments: [
                            ...(debt.payments ?? []),
                            createPaymentRecord(debt, remaining, now, 'Marked as paid'),
                          ],
                          updatedAt: now,
                        },
                        new Date(now)
                      )
                    : syncDebtLedger(debt, new Date(now));

                return settleDebtWithLifecycle(
                  state.debts.filter((candidate) => candidate.id !== id),
                  withPayment,
                  now
                );
              })
            ),
          };
        }),
      clearAll: () => set({ debts: [] }),
      syncGroupDebtsToLedger: (group, expenses, settlements) => {
        const targets = computeGroupDebtTargets(group, expenses, settlements);
        const targetMemberIds = new Set(targets.map((t) => t.memberId));

        set((state) => {
          const withoutStale = state.debts.filter(
            (debt) =>
              !isGroupSyncedDebt(debt, group.id) ||
              targetMemberIds.has(debt.sourceMemberId ?? '')
          );

          const manualDebts = withoutStale.filter((d) => !isGroupSyncedDebt(d, group.id));
          const existingSynced = withoutStale.filter((d) => isGroupSyncedDebt(d, group.id));

          const syncedDebts: Debt[] = [];
          for (const target of targets) {
            const existing = existingSynced.find((d) => d.sourceMemberId === target.memberId);
            syncedDebts.push(buildGroupSyncedDebt(group, target, existing));
          }

          return { debts: withSyncedDebts([...manualDebts, ...syncedDebts]) };
        });
      },
      removeGroupSyncedDebtsForGroup: (groupId) =>
        set((state) => ({
          debts: withSyncedDebts(state.debts.filter((d) => !isGroupSyncedDebt(d, groupId))),
        })),
    }),
    {
      name: 'debtly-debts',
      version: 2,
      storage: createJSONStorage(() => zustandStorage),
      migrate: (persistedState, version) => {
        const state = persistedState as { debts?: Debt[] };
        if (!state?.debts) return persistedState;
        if (version < 2) {
          return { ...state, debts: migrateDebts(state.debts) };
        }
        return { ...state, debts: migrateDebts(state.debts) };
      },
    }
  )
);

export const useDebtSummary = () => {
  const debts = useDebtStore((s) => s.debts);
  const owedToMe = debts.filter((d) => d.type === 'owed_to_me' && d.status !== 'paid');
  const iOwe = debts.filter((d) => d.type === 'i_owe' && d.status !== 'paid');
  return {
    debts,
    owedToMe,
    iOwe,
    totalOwedToMe: owedToMe.reduce((sum, debt) => sum + getRemainingBalance(debt), 0),
    totalIOwe: iOwe.reduce((sum, debt) => sum + getRemainingBalance(debt), 0),
    settledCount: debts.filter((d) => d.status === 'paid').length,
  };
};
