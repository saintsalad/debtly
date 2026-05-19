/** Shared shapes for Convex split-bill logic (mirrors app `features/group-expense/types.ts`). */

export type SplitMethod = 'equal' | 'exact' | 'percentage' | 'shares' | 'adjustment';

export interface GroupMember {
  id: string;
  displayName: string;
  isCurrentUser: boolean;
  username?: string;
  /** Convex profile photo URL when the member is a linked auth user */
  avatarUri?: string;
  color?: string;
  joinedAt: string;
}

export interface ExpenseShare {
  memberId: string;
  valueMinor?: number;
  percentBps?: number;
  shareParts?: number;
  adjustmentMinor?: number;
}

export interface SplitGroup {
  id: string;
  name: string;
  /** ISO 4217; echoed to every client so expenses default consistently */
  currency: string;
  imageUri?: string;
  inviteCode: string;
  members: GroupMember[];
  createdByMemberId?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface GroupExpense {
  id: string;
  groupId: string;
  title: string;
  amountMinor: number;
  currency: string;
  paidByMemberId: string;
  splitMethod: SplitMethod;
  shares: ExpenseShare[];
  includedMemberIds: string[];
  note?: string;
  receiptUri?: string;
  expenseDate: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  deletedAt?: string;
}

export interface Settlement {
  id: string;
  groupId: string;
  fromMemberId: string;
  toMemberId: string;
  amountMinor: number;
  note?: string;
  settledAt: string;
  version: number;
}

export interface PairwiseBalance {
  memberId: string;
  displayName: string;
  netMinor: number;
}

export interface GroupBalanceSummary {
  totalSpendMinor: number;
  youOweMinor: number;
  youAreOwedMinor: number;
  isSettled: boolean;
  pairwise: PairwiseBalance[];
  memberBalances: Array<{
    memberId: string;
    displayName: string;
    isCurrentUser: boolean;
    netMinor: number;
  }>;
}
