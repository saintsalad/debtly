import type { GroupExpenseState } from '@/features/group-expense/types';

/** Default store / DB reset shape — no sample groups or expenses. */
export const EMPTY_GROUP_EXPENSE_STATE: GroupExpenseState = {
  groups: [],
  expenses: [],
  settlements: [],
  activityLog: [],
  pendingOps: [],
};
