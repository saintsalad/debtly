import type {
  ActivityLogEntry,
  GroupExpense,
  GroupExpenseState,
  Settlement,
  SplitGroup,
} from '@/features/group-expense/types';

/** Merge Convex `listMineFull` snapshot into local SQLite-backed state; preserve legacy local-only groups. */
export function mergeConvexSplitSnapshot(
  prev: GroupExpenseState,
  convex: {
    groups: SplitGroup[];
    expenses: GroupExpense[];
    settlements: Settlement[];
    activityLog: ActivityLogEntry[];
  }
): GroupExpenseState {
  const convexGroupIds = new Set(convex.groups.map((g) => g.id));

  const localGroups = prev.groups.filter(
    (g) => g.syncMode !== 'convex' && !convexGroupIds.has(g.id)
  );

  const mergedGroups: SplitGroup[] = [
    ...convex.groups.map((g) => ({ ...g, syncMode: 'convex' as const })),
    ...localGroups,
  ];

  const mergedGroupIds = new Set(mergedGroups.map((g) => g.id));

  /** Mirrored cloud rows always come from `convex.*`; never carry forward stale Zustand copies (e.g. after logout or empty snapshot). */
  const keepLocalExpense = (e: GroupExpense) => {
    const g = prev.groups.find((x) => x.id === e.groupId);
    if (g?.syncMode === 'convex') return false;
    return !convexGroupIds.has(e.groupId);
  };

  const keepLocalSettlement = (s: Settlement) => {
    const g = prev.groups.find((x) => x.id === s.groupId);
    if (g?.syncMode === 'convex') return false;
    return !convexGroupIds.has(s.groupId);
  };

  const keepLocalActivity = (a: ActivityLogEntry) => {
    const g = prev.groups.find((x) => x.id === a.groupId);
    if (g?.syncMode === 'convex') return false;
    return !convexGroupIds.has(a.groupId);
  };

  const mergedExpenses = [
    ...convex.expenses,
    ...prev.expenses.filter(keepLocalExpense),
  ].filter((e) => mergedGroupIds.has(e.groupId));

  const mergedSettlements = [
    ...convex.settlements,
    ...prev.settlements.filter(keepLocalSettlement),
  ].filter((s) => mergedGroupIds.has(s.groupId));

  const mergedActivity = [...convex.activityLog, ...prev.activityLog.filter(keepLocalActivity)]
    .filter((a) => mergedGroupIds.has(a.groupId))
    .sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime());

  return {
    groups: mergedGroups,
    expenses: mergedExpenses,
    settlements: mergedSettlements,
    activityLog: mergedActivity,
    pendingOps: prev.pendingOps,
  };
}

export function isCloudSplitGroup(group: SplitGroup | undefined): boolean {
  return group?.syncMode === 'convex';
}
