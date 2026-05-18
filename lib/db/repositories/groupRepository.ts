import type { GroupExpenseState } from '@/features/group-expense/types';
import type { DebtlyDatabase } from '@/lib/db/client';
import { assembleGroupState, flattenGroupState } from '@/lib/db/mappers/group';
import {
  activityLog,
  groupExpenses,
  groupMembers,
  groups,
  pendingOps,
  settlements,
} from '@/lib/db/schema';

export async function loadGroupState(db: DebtlyDatabase): Promise<GroupExpenseState> {
  const [groupRows, memberRows, expenseRows, settlementRows, activityRows, pendingRows] =
    await Promise.all([
      db.select().from(groups),
      db.select().from(groupMembers),
      db.select().from(groupExpenses),
      db.select().from(settlements),
      db.select().from(activityLog),
      db.select().from(pendingOps),
    ]);

  return assembleGroupState(
    groupRows,
    memberRows,
    expenseRows,
    settlementRows,
    activityRows,
    pendingRows
  );
}

export async function replaceGroupState(
  db: DebtlyDatabase,
  state: GroupExpenseState
): Promise<void> {
  const flat = flattenGroupState(state);

  await db.transaction(async (tx) => {
    await tx.delete(pendingOps);
    await tx.delete(activityLog);
    await tx.delete(settlements);
    await tx.delete(groupExpenses);
    await tx.delete(groupMembers);
    await tx.delete(groups);

    if (flat.groups.length > 0) await tx.insert(groups).values(flat.groups);
    if (flat.members.length > 0) await tx.insert(groupMembers).values(flat.members);
    if (flat.expenses.length > 0) await tx.insert(groupExpenses).values(flat.expenses);
    if (flat.settlements.length > 0) await tx.insert(settlements).values(flat.settlements);
    if (flat.activity.length > 0) await tx.insert(activityLog).values(flat.activity);
    if (flat.pendingOps.length > 0) await tx.insert(pendingOps).values(flat.pendingOps);
  });
}
