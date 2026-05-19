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

  const localExpenses = prev.expenses.filter((e) => !convexGroupIds.has(e.groupId));
  const mergedExpenses = [...convex.expenses, ...localExpenses];

  const localSettlements = prev.settlements.filter((s) => !convexGroupIds.has(s.groupId));
  const mergedSettlements = [...convex.settlements, ...localSettlements];

  const localActivity = prev.activityLog.filter((a) => !convexGroupIds.has(a.groupId));
  const mergedActivity = [...convex.activityLog, ...localActivity].sort(
    (x, y) => new Date(y.at).getTime() - new Date(x.at).getTime()
  );

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
