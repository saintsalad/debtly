import { defineSchema, defineTable } from 'convex/server';
import { authTables } from '@convex-dev/auth/server';
import { v } from 'convex/values';

const splitMethodValidator = v.union(
  v.literal('equal'),
  v.literal('exact'),
  v.literal('percentage'),
  v.literal('shares'),
  v.literal('adjustment')
);

const expenseShareValidator = v.object({
  memberId: v.string(),
  valueMinor: v.optional(v.number()),
  percentBps: v.optional(v.number()),
  shareParts: v.optional(v.number()),
  adjustmentMinor: v.optional(v.number()),
});

const activityKindValidator = v.union(
  v.literal('group_created'),
  v.literal('group_updated'),
  v.literal('expense_added'),
  v.literal('expense_edited'),
  v.literal('expense_deleted'),
  v.literal('settlement_recorded'),
  v.literal('settlements_voided'),
  v.literal('member_joined'),
  v.literal('member_removed'),
  v.literal('member_renamed')
);

/** Auth + extended `users.username` for display/sync. */
export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    username: v.optional(v.string()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
  })
    .index('email', ['email'])
    .index('phone', ['phone'])
    .index('username', ['username']),

  splitGroups: defineTable({
    name: v.string(),
    imageStorageId: v.optional(v.id('_storage')),
    createdByUserId: v.id('users'),
    createdAt: v.number(),
    updatedAt: v.number(),
    version: v.number(),
  }).index('by_creator', ['createdByUserId']),

  splitGroupMembers: defineTable({
    groupId: v.id('splitGroups'),
    userId: v.optional(v.id('users')),
    displayName: v.string(),
    isPlaceholder: v.boolean(),
    joinedAt: v.number(),
  })
    .index('by_group', ['groupId'])
    .index('by_user', ['userId']),

  splitGroupInvites: defineTable({
    groupId: v.id('splitGroups'),
    code: v.string(),
    createdAt: v.number(),
    revokedAt: v.optional(v.number()),
  })
    .index('by_code', ['code'])
    .index('by_group', ['groupId']),

  splitGroupExpenses: defineTable({
    groupId: v.id('splitGroups'),
    title: v.string(),
    amountMinor: v.number(),
    currency: v.string(),
    paidByMemberId: v.string(),
    splitMethod: splitMethodValidator,
    shares: v.array(expenseShareValidator),
    includedMemberIds: v.array(v.string()),
    note: v.optional(v.string()),
    receiptUri: v.optional(v.string()),
    expenseDate: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
    version: v.number(),
    deletedAt: v.optional(v.string()),
  }).index('by_group', ['groupId']),

  splitGroupSettlements: defineTable({
    groupId: v.id('splitGroups'),
    fromMemberId: v.string(),
    toMemberId: v.string(),
    amountMinor: v.number(),
    note: v.optional(v.string()),
    settledAt: v.string(),
    version: v.number(),
  }).index('by_group', ['groupId']),

  splitGroupActivity: defineTable({
    groupId: v.id('splitGroups'),
    kind: activityKindValidator,
    at: v.string(),
    actorMemberId: v.string(),
    expenseId: v.optional(v.string()),
    settlementId: v.optional(v.string()),
    targetMemberId: v.optional(v.string()),
    title: v.string(),
    subtitle: v.optional(v.string()),
    amountMinor: v.optional(v.number()),
  }).index('by_group', ['groupId']),
});
