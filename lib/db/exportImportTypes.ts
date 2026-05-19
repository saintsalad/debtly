import type { ProfileData } from '@/lib/db/mappers/profile';
import type { Debt } from '@/features/debts/types';
import type { BillSplit } from '@/features/bill-split/types';
import type { GroupExpenseState } from '@/features/group-expense/types';

export const EXPORT_DATA_VERSION = 1;

export interface ExportData {
  version: number;
  exportedAt: string;
  profile: ProfileData;
  debts: Debt[];
  groups: GroupExpenseState;
  billSplits: BillSplit[];
}
