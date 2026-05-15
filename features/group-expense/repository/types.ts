import type {
  AddExpenseInput,
  CreateGroupInput,
  GroupExpense,
  GroupExpenseState,
  RecordSettlementInput,
  Settlement,
  SplitGroup,
} from '@/features/group-expense/types';

export interface IGroupExpenseRepository {
  load(): Promise<GroupExpenseState>;
  createGroup(input: CreateGroupInput): Promise<SplitGroup>;
  updateGroup(id: string, updates: Partial<Pick<SplitGroup, 'name' | 'imageUri'>>): Promise<void>;
  deleteGroup(id: string): Promise<void>;
  addExpense(input: AddExpenseInput): Promise<GroupExpense>;
  updateExpense(id: string, input: Partial<AddExpenseInput>): Promise<GroupExpense>;
  deleteExpense(id: string): Promise<void>;
  recordSettlement(input: RecordSettlementInput): Promise<Settlement>;
}
