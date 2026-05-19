import { api } from '@/convex/_generated/api';
import { isConvexConfigured } from '@/lib/convex/env';
import { mergeConvexSplitSnapshot } from '@/features/group-expense/mergeConvexSplitSnapshot';
import { useGroupExpenseStore } from '@/stores/groupExpenseStore';
import { useConvexAuth } from 'convex/react';
import { useQuery } from 'convex/react';
import { useEffect } from 'react';

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
      return;
    }

    useGroupExpenseStore.setState((prev) => mergeConvexSplitSnapshot(prev, snapshot));
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
