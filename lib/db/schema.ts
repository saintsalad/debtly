import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const appMeta = sqliteTable('app_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const profileSettings = sqliteTable('profile_settings', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  /** Local normalized handle; mirrored from Convex signup for offline UI. */
  username: text('username'),
  currency: text('currency').notNull(),
  appearance: text('appearance').notNull(),
  showSplitBillsInTransactions: integer('show_split_bills_in_transactions', {
    mode: 'boolean',
  })
    .notNull()
    .default(false),
  receiptThermalLook: integer('receipt_thermal_look', { mode: 'boolean' }).notNull().default(true),
  /** Local `file://` path or remote `https://` profile photo (compressed on device before upload). */
  avatarUri: text('avatar_uri'),
});

export const debts = sqliteTable('debts', {
  id: text('id').primaryKey(),
  personName: text('person_name').notNull(),
  principalMinor: integer('principal_minor').notNull(),
  type: text('type').notNull(),
  sourceType: text('source_type'),
  sourceGroupId: text('source_group_id'),
  sourceMemberId: text('source_member_id'),
  splitGroupId: text('split_group_id'),
  note: text('note'),
  dueDate: text('due_date'),
  startDate: text('start_date'),
  status: text('status').notNull(),
  interestRateBps: integer('interest_rate_bps'),
  interestType: text('interest_type'),
  interestStartMode: text('interest_start_mode'),
  interestAccrualFrequency: text('interest_accrual_frequency'),
  interestStartDate: text('interest_start_date'),
  accruedInterestMinor: integer('accrued_interest_minor'),
  interestPaidMinor: integer('interest_paid_minor'),
  principalPaidMinor: integer('principal_paid_minor'),
  paidAt: text('paid_at'),
  isRecurring: integer('is_recurring', { mode: 'boolean' }),
  recurrenceInterval: text('recurrence_interval'),
  recurrenceAnchorDate: text('recurrence_anchor_date'),
  nextCycleDate: text('next_cycle_date'),
  lastGeneratedAt: text('last_generated_at'),
  recurringGroupId: text('recurring_group_id'),
  recurringSourceId: text('recurring_source_id'),
  carryOverBalance: integer('carry_over_balance', { mode: 'boolean' }),
  carryOverMinor: integer('carry_over_minor'),
  instalmentTotal: integer('instalment_total'),
  instalmentCount: integer('instalment_count'),
  instalmentIndex: integer('instalment_index'),
  currency: text('currency'),
  originalAmountMinor: integer('original_amount_minor'),
  conversionRate: text('conversion_rate'),
  recurrenceFrequency: text('recurrence_frequency'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const debtPayments = sqliteTable('debt_payments', {
  id: text('id').primaryKey(),
  debtId: text('debt_id')
    .notNull()
    .references(() => debts.id, { onDelete: 'cascade' }),
  amountMinor: integer('amount_minor').notNull(),
  interestAppliedMinor: integer('interest_applied_minor').notNull(),
  principalAppliedMinor: integer('principal_applied_minor').notNull(),
  paidAt: text('paid_at').notNull(),
  note: text('note'),
});

export const groups = sqliteTable('groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  currency: text('currency'),
  imageUri: text('image_uri'),
  inviteCode: text('invite_code').notNull(),
  createdByMemberId: text('created_by_member_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  version: integer('version').notNull(),
  /** `local` (default) vs Convex-backed `splitGroups` sync. */
  syncMode: text('sync_mode').notNull().default('local'),
});

export const groupMembers = sqliteTable('group_members', {
  id: text('id').primaryKey(),
  groupId: text('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
  displayName: text('display_name').notNull(),
  isCurrentUser: integer('is_current_user', { mode: 'boolean' }).notNull(),
  username: text('username'),
  avatarUri: text('avatar_uri'),
  color: text('color'),
  /** Host-added labels vs someone who joined (local/offline heuristic). */
  isPlaceholder: integer('is_placeholder', { mode: 'boolean' }).notNull().default(true),
  joinedAt: text('joined_at').notNull(),
});

export const groupExpenses = sqliteTable('group_expenses', {
  id: text('id').primaryKey(),
  groupId: text('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  amountMinor: integer('amount_minor').notNull(),
  currency: text('currency').notNull(),
  paidByMemberId: text('paid_by_member_id').notNull(),
  splitMethod: text('split_method').notNull(),
  sharesJson: text('shares_json').notNull(),
  includedMemberIdsJson: text('included_member_ids_json').notNull(),
  note: text('note'),
  receiptUri: text('receipt_uri'),
  expenseDate: text('expense_date').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  version: integer('version').notNull(),
  deletedAt: text('deleted_at'),
});

export const settlements = sqliteTable('settlements', {
  id: text('id').primaryKey(),
  groupId: text('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
  fromMemberId: text('from_member_id').notNull(),
  toMemberId: text('to_member_id').notNull(),
  amountMinor: integer('amount_minor').notNull(),
  note: text('note'),
  settledAt: text('settled_at').notNull(),
  version: integer('version').notNull(),
});

export const activityLog = sqliteTable('activity_log', {
  id: text('id').primaryKey(),
  groupId: text('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(),
  at: text('at').notNull(),
  actorMemberId: text('actor_member_id').notNull(),
  expenseId: text('expense_id'),
  settlementId: text('settlement_id'),
  targetMemberId: text('target_member_id'),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  amountMinor: integer('amount_minor'),
});

export const pendingOps = sqliteTable('pending_ops', {
  id: text('id').primaryKey(),
  op: text('op').notNull(),
  entityId: text('entity_id').notNull(),
  version: integer('version').notNull(),
  clientId: text('client_id').notNull(),
  createdAt: text('created_at').notNull(),
});

export const billSplits = sqliteTable('bill_splits', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  total: integer('total').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const billSplitParticipants = sqliteTable('bill_split_participants', {
  id: text('id').primaryKey(),
  billSplitId: text('bill_split_id')
    .notNull()
    .references(() => billSplits.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  amount: integer('amount').notNull(),
  paid: integer('paid', { mode: 'boolean' }).notNull(),
});
