import type { DebtlyDatabase } from '@/lib/db/client';
import { loadBillSplits } from '@/lib/db/repositories/billSplitRepository';
import { loadDebts } from '@/lib/db/repositories/debtRepository';
import { loadGroupState } from '@/lib/db/repositories/groupRepository';
import { loadProfile } from '@/lib/db/repositories/profileRepository';
import { ensureDefaultProfile } from '@/lib/db/repositories/profileRepository';
import { syncDebtLedger } from '@/features/debts/debtLedger';
import { useBillSplitStore } from '@/stores/billSplitStore';
import { useDebtStore } from '@/stores/debtStore';
import { useGroupExpenseStore } from '@/stores/groupExpenseStore';
import { useProfileStore } from '@/stores/profileStore';

export async function hydrateStoresFromDatabase(db: DebtlyDatabase): Promise<void> {
  await ensureDefaultProfile(db);

  const [profile, debts, groupState, billSplits] = await Promise.all([
    loadProfile(db),
    loadDebts(db),
    loadGroupState(db),
    loadBillSplits(db),
  ]);

  useProfileStore.setState({
    name: profile.name,
    username: profile.username ?? null,
    currency: profile.currency,
    appearance: profile.appearance,
    showSplitBillsInTransactions: profile.showSplitBillsInTransactions,
    receiptThermalLook: profile.receiptThermalLook,
  });

  useGroupExpenseStore.setState(groupState);
  useBillSplitStore.setState({ splits: billSplits });

  useDebtStore.setState({ debts });

  syncGroupDebtsToLedgerForAllGroups();
}

function syncGroupDebtsToLedgerForAllGroups(): void {
  const { groups, expenses, settlements } = useGroupExpenseStore.getState();
  for (const group of groups) {
    useDebtStore.getState().syncGroupDebtsToLedger(group, expenses, settlements);
  }
}

export function syncDebtsAfterHydration(): void {
  const debts = useDebtStore.getState().debts.map((d) => syncDebtLedger(d));
  useDebtStore.setState({ debts });
}
