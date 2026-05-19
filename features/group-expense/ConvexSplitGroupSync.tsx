import { api } from '@/convex/_generated/api';
import { isConvexConfigured } from '@/lib/convex/env';
import { mergeConvexSplitSnapshot } from '@/features/group-expense/mergeConvexSplitSnapshot';
import { useGroupExpenseStore } from '@/stores/groupExpenseStore';
import { useDebtStore } from '@/stores/debtStore';
import { useConvexAuth } from 'convex/react';
import { useQuery } from 'convex/react';
import { useEffect } from 'react';

function reconcileSplitDebtsWithStores(): void {
  const snap = useGroupExpenseStore.getState();
  const validGroupIds = new Set(snap.groups.map((g) => g.id));
  useDebtStore.getState().pruneGroupSyncedDebts(validGroupIds);
  for (const g of snap.groups) {
    useDebtStore.getState().syncGroupDebtsToLedger(g, snap.expenses, snap.settlements);
  }
}

function ConvexSplitGroupSyncInner() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const authReady = !isLoading && isAuthenticated;

  const snapshot = useQuery(api.splitGroups.listMineFull, authReady ? {} : 'skip');

  useEffect(() => {
    if (!authReady) {
      useGroupExpenseStore.setState((prev) =>
        mergeConvexSplitSnapshot(prev, {
          groups: [],
          expenses: [],
          settlements: [],
          activityLog: [],
        })
      );
      reconcileSplitDebtsWithStores();
      return;
    }
    if (snapshot === undefined) return;

    if (snapshot === null) {
      useGroupExpenseStore.setState((prev) =>
        mergeConvexSplitSnapshot(prev, {
          groups: [],
          expenses: [],
          settlements: [],
          activityLog: [],
        })
      );
      reconcileSplitDebtsWithStores();
      return;
    }

    useGroupExpenseStore.setState((prev) => mergeConvexSplitSnapshot(prev, snapshot));
    reconcileSplitDebtsWithStores();
  }, [authReady, snapshot]);

  return null;
}

/**
 * Subscribes to Convex split-bill state and merges into Zustand/SQLite (local legacy rows preserved).
 */
export function ConvexSplitGroupSync() {
  if (!isConvexConfigured()) return null;
  return <ConvexSplitGroupSyncInner />;
}
