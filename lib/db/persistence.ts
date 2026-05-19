import type { DebtlyDatabase } from '@/lib/db/client';
import { replaceBillSplits } from '@/lib/db/repositories/billSplitRepository';
import { replaceDebts } from '@/lib/db/repositories/debtRepository';
import { replaceGroupState } from '@/lib/db/repositories/groupRepository';
import { replaceProfile } from '@/lib/db/repositories/profileRepository';
import { subscribeStore } from '@/lib/db/storePersistence';
import { useBillSplitStore } from '@/stores/billSplitStore';
import { useDebtStore } from '@/stores/debtStore';
import { useGroupExpenseStore } from '@/stores/groupExpenseStore';
import { useProfileStore } from '@/stores/profileStore';

export function attachStorePersistence(db: DebtlyDatabase): () => void {
  const unsubProfile = subscribeStore(useProfileStore, (state) =>
    replaceProfile(db, {
      name: state.name,
      username: state.username,
      currency: state.currency,
      appearance: state.appearance,
      showSplitBillsInTransactions: state.showSplitBillsInTransactions,
      receiptThermalLook: state.receiptThermalLook,
    })
  );

  const unsubDebts = subscribeStore(useDebtStore, (state) => replaceDebts(db, state.debts));

  const unsubGroups = subscribeStore(useGroupExpenseStore, (state) =>
    replaceGroupState(db, {
      groups: state.groups,
      expenses: state.expenses,
      settlements: state.settlements,
      activityLog: state.activityLog,
      pendingOps: state.pendingOps,
    })
  );

  const unsubBillSplits = subscribeStore(useBillSplitStore, (state) =>
    replaceBillSplits(db, state.splits)
  );

  return () => {
    unsubProfile();
    unsubDebts();
    unsubGroups();
    unsubBillSplits();
  };
}
