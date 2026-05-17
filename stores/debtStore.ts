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
  createInstalmentPlanDebts,
  getRemainingBalance,
  isDebtActive,
  validateAddDebtInput,
} from '@/features/debts/debtCalculations';
import {
  createPaymentRecord,
  projectDebtLedger,
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
import { majorToMinor } from '@/features/debts/money';
import { generateId } from '@/lib/utils';

interface DebtState {
  debts: Debt[];
  addDebt: (input: AddDebtInput) => string | null;
  updateDebt: (id: string, updates: Partial<Debt>) => void;
  deleteDebt: (id: string) => void;
  recordPayment: (id: string, input: RecordPaymentInput) => string | null;
  deletePayment: (debtId: string, paymentId: string) => void;
  markPaid: (id: string) => void;
  /** Reopens a paid debt when settlement was mistaken; see store implementation for limits. */
  markUnpaid: (id: string) => string | null;
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

/**
 * Close a carry-over recurring cycle without force-paying the remainder.
 * The unpaid balance is stored on the settled debt so the next cycle can add it to its principal.
 */
function closeCarryOverCycle(debts: Debt[], debt: Debt, closedAt: string): Debt[] {
  const snapshot = projectDebtLedger(debt, new Date(closedAt));
  const carryOverMinor = Math.max(0, snapshot.remainingMinor);

  const settled: Debt = {
    ...debt,
    status: 'paid',
    paidAt: closedAt,
    accruedInterestMinor: snapshot.accruedInterestMinor,
    interestPaidMinor: snapshot.interestPaidMinor,
    principalPaidMinor: snapshot.principalPaidMinor,
    carryOverMinor,
    updatedAt: closedAt,
  };

  const stamped = stampRecurringGeneration(settled, closedAt);
  const nextCycle = canGenerateNextRecurringCycle(debts, stamped)
    ? buildNextRecurringCycle(stamped, closedAt)
    : null;

  return nextCycle ? [stamped, nextCycle] : [stamped];
}

function withSyncedDebts(debts: Debt[]): Debt[] {
  return debts.map((debt) => syncDebtLedger(debt));
}

/** Synthetic row appended by `markPaid` when closing a remaining balance. */
const SETTLEMENT_NOTE_MARKED_PAID = 'Marked as paid';

/**
 * Recurring / instalment flows spawn a pending next-cycle debt with the same timestamp as `paidAt`.
 * When reopening a settled cycle, drop that sibling so the ledger does not show two open cycles.
 */
function isSpawnedRecurringCycle(parent: Debt, candidate: Debt, paidAt: string | undefined): boolean {
  if (!paidAt || candidate.id === parent.id) return false;
  if (candidate.status !== 'pending') return false;
  if ((candidate.payments?.length ?? 0) > 0) return false;
  if (candidate.createdAt !== paidAt) return false;
  const group = parent.recurringGroupId ?? parent.id;
  return candidate.recurringGroupId === group;
}

export const useDebtStore = create<DebtState>()(
  persist(
    (set, get) => ({
      debts: INITIAL_DEBTS,
      addDebt: (input) => {
        const validationError = validateAddDebtInput(input);
        if (validationError) return validationError;

        const now = new Date().toISOString();

        // Feature #1: split a single payment across multiple people
        if (input.splitPeople && input.splitPeople.length > 0) {
          const people = input.splitPeople.filter((p) => p.trim());
          if (people.length === 0) return 'Add at least one person.';

          const perPersonAmount = input.amount / people.length;
          const sharedSplitGroupId = generateId();

          const newDebts: Debt[] = people.map((personName) => {
            const debt = createDebtFromInput(
              { ...input, personName: personName.trim(), amount: perPersonAmount },
              now
            );
            return { ...debt, splitGroupId: sharedSplitGroupId, sourceType: 'personal_split' as const };
          });

          set((state) => ({ debts: [...newDebts, ...withSyncedDebts(state.debts)] }));
          return null;
        }

        // Feature: instalment plan — one ledger entry per payment, spaced by recurrence (no spawn-on-settle).
        const instalmentCount =
          input.instalmentCount != null && input.instalmentCount >= 2
            ? input.instalmentCount
            : null;
        if (input.isRecurring && instalmentCount != null) {
          try {
            const instalmentDebts = createInstalmentPlanDebts(input, now);
            set((state) => ({
              debts: withSyncedDebts([...instalmentDebts, ...state.debts]),
            }));
          } catch {
            return 'Could not create instalment plan.';
          }
          return null;
        }

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

                // Feature #2/#7: carry-over recurring cycle — close without force-paying remainder
                if (debt.isRecurring && debt.carryOverBalance) {
                  return closeCarryOverCycle(
                    state.debts.filter((candidate) => candidate.id !== id),
                    debt,
                    now
                  );
                }

                const remaining = getRemainingBalance(debt);
                const withPayment =
                  remaining > 0.009
                    ? syncDebtLedger(
                        {
                          ...debt,
                          payments: [
                            ...(debt.payments ?? []),
                            createPaymentRecord(debt, remaining, now, SETTLEMENT_NOTE_MARKED_PAID),
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
      markUnpaid: (id) => {
        const now = new Date().toISOString();
        const state = get();
        const debt = state.debts.find((d) => d.id === id);
        if (!debt || debt.status !== 'paid') {
          return 'Not marked paid.';
        }

        const paidAt = debt.paidAt;
        const filteredPayments = (debt.payments ?? []).filter(
          (p) => p.note !== SETTLEMENT_NOTE_MARKED_PAID
        );

        const reopened: Debt = {
          ...debt,
          status: 'pending',
          paidAt: undefined,
          accruedInterestMinor: undefined,
          carryOverMinor: undefined,
          lastGeneratedAt: undefined,
          payments: filteredPayments,
          updatedAt: now,
        };

        const snapshot = projectDebtLedger(reopened, new Date(now));
        if (snapshot.isSettled) {
          return 'Payments already cover the balance. Remove one first.';
        }

        const synced = syncDebtLedger(reopened, new Date(now));
        if (synced.status === 'paid') {
          return 'Could not reopen.';
        }

        const nextList = state.debts
          .filter((d) => d.id === id || !isSpawnedRecurringCycle(debt, d, paidAt))
          .map((d) => (d.id === id ? synced : d));

        set({ debts: withSyncedDebts(nextList) });
        return null;
      },
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
  // Exclude future-dated (inactive) debts from balance totals
  const owedToMe = debts.filter((d) => d.type === 'owed_to_me' && d.status !== 'paid' && isDebtActive(d));
  const iOwe = debts.filter((d) => d.type === 'i_owe' && d.status !== 'paid' && isDebtActive(d));
  return {
    debts,
    owedToMe,
    iOwe,
    totalOwedToMe: owedToMe.reduce((sum, debt) => sum + getRemainingBalance(debt), 0),
    totalIOwe: iOwe.reduce((sum, debt) => sum + getRemainingBalance(debt), 0),
    settledCount: debts.filter((d) => d.status === 'paid').length,
  };
};
