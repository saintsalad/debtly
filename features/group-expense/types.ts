export type SplitMethod = 'equal' | 'exact' | 'percentage';

export interface GroupMember {
  id: string;
  displayName: string;
  isCurrentUser: boolean;
  username?: string;
  color?: string;
  joinedAt: string;
}

export interface ExpenseShare {
  memberId: string;
  valueMinor?: number;
  percentBps?: number;
}

export interface SplitGroup {
  id: string;
  name: string;
  imageUri?: string;
  inviteCode: string;
  members: GroupMember[];
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

export interface PendingOp {
  id: string;
  op: string;
  entityId: string;
  version: number;
  clientId: string;
  createdAt: string;
}

export type ActivityKind =
  | 'group_created'
  | 'group_updated'
  | 'expense_added'
  | 'expense_edited'
  | 'expense_deleted'
  | 'settlement_recorded'
  | 'member_joined'
  | 'member_removed';

/** Immutable audit log entry — append-only for accountability. */
export interface ActivityLogEntry {
  id: string;
  groupId: string;
  kind: ActivityKind;
  at: string;
  actorMemberId: string;
  expenseId?: string;
  settlementId?: string;
  targetMemberId?: string;
  title: string;
  subtitle?: string;
  amountMinor?: number;
}

export type ActivityItem = ActivityLogEntry;

export interface MemberBalance {
  memberId: string;
  displayName: string;
  isCurrentUser: boolean;
  /** Positive = member owes current user; negative = current user owes member */
  netMinor: number;
}

export interface PairwiseBalance {
  memberId: string;
  displayName: string;
  /** Positive = they owe you; negative = you owe them */
  netMinor: number;
}

export interface GroupBalanceSummary {
  totalSpendMinor: number;
  youOweMinor: number;
  youAreOwedMinor: number;
  isSettled: boolean;
  pairwise: PairwiseBalance[];
  memberBalances: MemberBalance[];
}

export interface CreateGroupInput {
  name: string;
  memberNames?: string[];
  imageUri?: string;
}

export interface AddExpenseInput {
  groupId: string;
  title: string;
  amount: number;
  paidByMemberId: string;
  splitMethod: SplitMethod;
  includedMemberIds: string[];
  shares?: ExpenseShare[];
  note?: string;
  receiptUri?: string;
  expenseDate?: string;
}

export interface RecordSettlementInput {
  groupId: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  note?: string;
}

/** Legacy bill-split shape for migration */
export interface LegacyBillSplit {
  id: string;
  title: string;
  total: number;
  participants: Array<{ id: string; name: string; amount: number; paid: boolean }>;
  createdAt: string;
  updatedAt: string;
}

export interface GroupExpenseState {
  groups: SplitGroup[];
  expenses: GroupExpense[];
  settlements: Settlement[];
  activityLog: ActivityLogEntry[];
  pendingOps: PendingOp[];
}
