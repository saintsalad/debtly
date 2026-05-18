import type { IGroupExpenseRepository } from '@/features/group-expense/repository/types';
import { useGroupExpenseStore } from '@/stores/groupExpenseStore';

/**
 * Thin adapter over Zustand for future remote repository swap.
 * Persistence is SQLite-backed via DatabaseProvider (debounced store → DB).
 * Future: ConvexGroupExpenseRepository implements the same interface for cloud sync.
 */
export const localGroupExpenseRepository: IGroupExpenseRepository = {
  async load() {
    const { groups, expenses, settlements, activityLog, pendingOps } =
      useGroupExpenseStore.getState();
    return { groups, expenses, settlements, activityLog, pendingOps };
  },
  async createGroup(input) {
    const id = useGroupExpenseStore.getState().createGroup(input);
    if (!id) throw new Error('Failed to create group');
    const group = useGroupExpenseStore.getState().getGroup(id);
    if (!group) throw new Error('Group not found');
    return group;
  },
  async updateGroup(id, updates) {
    useGroupExpenseStore.getState().updateGroup(id, updates);
  },
  async deleteGroup(id) {
    useGroupExpenseStore.getState().deleteGroup(id);
  },
  async addExpense(input) {
    const err = useGroupExpenseStore.getState().addExpense(input);
    if (err) throw new Error(err);
    const list = useGroupExpenseStore.getState().getGroupExpenses(input.groupId);
    const expense = list[0];
    if (!expense) throw new Error('Expense not found');
    return expense;
  },
  async updateExpense(id, input) {
    const err = useGroupExpenseStore.getState().updateExpense(id, input);
    if (err) throw new Error(err);
    const expense = useGroupExpenseStore.getState().expenses.find((e) => e.id === id);
    if (!expense) throw new Error('Expense not found');
    return expense;
  },
  async deleteExpense(id) {
    useGroupExpenseStore.getState().deleteExpense(id);
  },
  async recordSettlement(input) {
    const err = useGroupExpenseStore.getState().recordSettlement(input);
    if (err) throw new Error(err);
    const list = useGroupExpenseStore.getState().getGroupSettlements(input.groupId);
    const settlement = list[0];
    if (!settlement) throw new Error('Settlement not found');
    return settlement;
  },
};
