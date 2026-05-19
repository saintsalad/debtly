export type SplitMethod = 'equal' | 'exact' | 'percentage' | 'shares' | 'adjustment';

export interface GroupMember {
  id: string;
  displayName: string;
  isCurrentUser: boolean;
  username?: string;
  /** Profile photo URL (e.g. from Convex auth user) when available */
  avatarUri?: string;
  color?: string;
  joinedAt: string;
  /**
   * When set: `false` means the row is backed by an Auth user (invite join);
   * `true` means a host-added label only (“placeholder”).
   */
  isPlaceholder?: boolean;
}

export interface ExpenseShare {
  memberId: string;
  valueMinor?: number;
  percentBps?: number;
  /** Relative weight when splitMethod is 'shares' (e.g. 2 vs 1). Must be positive. */
  shareParts?: number;
  /** Delta from equal share (minor units) when splitMethod is 'adjustment'; must sum to 0 for included members. */
  adjustmentMinor?: number;
}

export type GroupSyncMode = 'local' | 'convex';

export interface SplitGroup {
  id: string;
  name: string;
  /** ISO 4217; set when the group is created (Convex mirrors server; local mirrors profile). */
  currency?: string;
  imageUri?: string;
  inviteCode: string;
  members: GroupMember[];
  /** Member who created the group (invite host). Persisted from createGroup; backfilled on load for older data. */
  createdByMemberId?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  /** `convex` groups mirror Convex `splitGroups`; writes go through mutations when authenticated. */
  syncMode?: GroupSyncMode;
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
  | 'settlements_voided'
  | 'member_joined'
  | 'member_removed'
  | 'member_renamed';

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
  avatarUri?: string;
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
