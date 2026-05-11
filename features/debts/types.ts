export type DebtType = 'owed_to_me' | 'i_owe';
export type DebtStatus = 'pending' | 'paid' | 'overdue';

export interface Debt {
  id: string;
  personName: string;
  amount: number;
  type: DebtType;
  note?: string;
  dueDate?: string;
  status: 'pending' | 'paid';
  createdAt: string;
  updatedAt: string;
}

export interface AddDebtInput {
  personName: string;
  amount: number;
  type: DebtType;
  note?: string;
  dueDate?: string;
}
