import { getAuthUserId } from '@convex-dev/auth/server';
import { ConvexError, v } from 'convex/values';

import type { GroupExpense, GroupMember, Settlement, SplitGroup } from './groupDomain';
import {
  amountToMinor,
  createDefaultShares,
  getDirectedOutstandingMinor,
  selectGroupBalances,
  validateExpenseShares,
} from './balanceEngine';
import { reconcileExpenseSplitsWhenMemberJoins } from './memberJoinExpenseSplit';
import type { Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import { MAX_INPUT_AMOUNT_MINOR } from './moneyConvex';

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

function secureInviteCode(): string {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return [...buf].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function isoFromMs(ms: number): string {
  return new Date(ms).toISOString();
}

async function requireUserId(ctx: { auth: unknown }): Promise<Id<'users'>> {
  const userId = await getAuthUserId(ctx as Parameters<typeof getAuthUserId>[0]);
  if (userId === null) throw new ConvexError('Not authenticated.');
  return userId;
}

async function getActiveInviteCode(ctx: any, groupId: Id<'splitGroups'>): Promise<string | null> {
  const invites = await ctx.db
    .query('splitGroupInvites')
    .withIndex('by_group', (q: any) => q.eq('groupId', groupId))
    .collect();
  const active = invites.filter((i: { revokedAt?: number }) => i.revokedAt == null);
  if (active.length === 0) return null;
  active.sort((a: { createdAt: number }, b: { createdAt: number }) => b.createdAt - a.createdAt);
  return active[0].code as string;
}

async function loadMembers(ctx: any, groupId: Id<'splitGroups'>) {
  return ctx.db
    .query('splitGroupMembers')
    .withIndex('by_group', (q: any) => q.eq('groupId', groupId))
    .collect();
}

async function assertMember(ctx: any, groupId: Id<'splitGroups'>, userId: Id<'users'>): Promise<void> {
  const members = await loadMembers(ctx, groupId);
  const ok = members.some((m: { userId?: Id<'users'> }) => m.userId === userId);
  if (!ok) throw new ConvexError('Not a member of this group.');
}

async function viewerMemberId(ctx: any, groupId: Id<'splitGroups'>, userId: Id<'users'>): Promise<string> {
  const members = await loadMembers(ctx, groupId);
  const row = members.find((m: { userId?: Id<'users'> }) => m.userId === userId);
  if (!row) throw new ConvexError('Not a member of this group.');
  return row._id as string;
}

function mapMemberToClient(
  row: { _id: Id<'splitGroupMembers'>; userId?: Id<'users'>; displayName: string; joinedAt: number },
  viewerUserId: Id<'users'>,
  usernameByUserId: Map<string, string | undefined>,
  avatarUriByUserId: Map<string, string | undefined>
): GroupMember {
  const uid = row.userId ? (row.userId as string) : undefined;
  return {
    id: row._id as string,
    displayName: row.displayName,
    isCurrentUser: row.userId === viewerUserId,
    username: uid ? usernameByUserId.get(uid) : undefined,
    avatarUri: uid ? avatarUriByUserId.get(uid) : undefined,
    joinedAt: isoFromMs(row.joinedAt),
  };
}

function normalizedGroupCurrency(raw: string | undefined): string {
  const t = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
  if (t.length >= 3) return t.slice(0, 3);
  return 'USD';
}

async function buildSplitGroupForViewer(
  ctx: any,
  groupDoc: {
    _id: Id<'splitGroups'>;
    name: string;
    currency?: string;
    imageStorageId?: Id<'_storage'>;
    createdByUserId: Id<'users'>;
    createdAt: number;
    updatedAt: number;
    version: number;
  },
  viewerUserId: Id<'users'>
): Promise<SplitGroup> {
  const memberRows = await loadMembers(ctx, groupDoc._id);
  const usernameByUserId = new Map<string, string | undefined>();
  const avatarUriByUserId = new Map<string, string | undefined>();
  for (const m of memberRows) {
    if (m.userId) {
      const u = await ctx.db.get(m.userId);
      const idStr = m.userId as string;
      usernameByUserId.set(idStr, u?.username ?? undefined);
      const img = u?.image;
      avatarUriByUserId.set(idStr, typeof img === 'string' && img.length > 0 ? img : undefined);
    }
  }
  const creatorMember = memberRows.find(
    (m: { userId?: Id<'users'> }) => m.userId === groupDoc.createdByUserId
  );
  const inviteCode = (await getActiveInviteCode(ctx, groupDoc._id)) ?? '';

  let imageUri: string | undefined;
  if (groupDoc.imageStorageId) {
    imageUri = (await ctx.storage.getUrl(groupDoc.imageStorageId)) ?? undefined;
  }

  return {
    id: groupDoc._id as string,
    name: groupDoc.name,
    currency: normalizedGroupCurrency(groupDoc.currency),
    imageUri,
    inviteCode,
    members: memberRows.map((r: (typeof memberRows)[number]) =>
      mapMemberToClient(r, viewerUserId, usernameByUserId, avatarUriByUserId)
    ),
    createdByMemberId: creatorMember?._id as string | undefined,
    createdAt: isoFromMs(groupDoc.createdAt),
    updatedAt: isoFromMs(groupDoc.updatedAt),
    version: groupDoc.version,
  };
}

export const listMineFull = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const memberships = await ctx.db
      .query('splitGroupMembers')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();

    const groupIds = [...new Set(memberships.map((m) => m.groupId))];

    const groups: SplitGroup[] = [];
    const expensesOut: GroupExpense[] = [];
    const settlementsOut: Settlement[] = [];
    const activityOut: Array<{
      id: string;
      groupId: string;
      kind: string;
      at: string;
      actorMemberId: string;
      expenseId?: string;
      settlementId?: string;
      targetMemberId?: string;
      title: string;
      subtitle?: string;
      amountMinor?: number;
    }> = [];

    for (const gid of groupIds) {
      const g = await ctx.db.get(gid);
      if (!g) continue;

      const sg = await buildSplitGroupForViewer(ctx, g, userId);
      groups.push(sg);

      const exRows = await ctx.db
        .query('splitGroupExpenses')
        .withIndex('by_group', (q) => q.eq('groupId', gid))
        .collect();
      for (const e of exRows) {
        expensesOut.push({
          id: e._id as string,
          groupId: gid as string,
          title: e.title,
          amountMinor: e.amountMinor,
          currency: e.currency,
          paidByMemberId: e.paidByMemberId,
          splitMethod: e.splitMethod,
          shares: e.shares,
          includedMemberIds: e.includedMemberIds,
          note: e.note,
          receiptUri: e.receiptUri,
          expenseDate: e.expenseDate,
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
          version: e.version,
          deletedAt: e.deletedAt,
        });
      }

      const stRows = await ctx.db
        .query('splitGroupSettlements')
        .withIndex('by_group', (q) => q.eq('groupId', gid))
        .collect();
      for (const s of stRows) {
        settlementsOut.push({
          id: s._id as string,
          groupId: gid as string,
          fromMemberId: s.fromMemberId,
          toMemberId: s.toMemberId,
          amountMinor: s.amountMinor,
          note: s.note,
          settledAt: s.settledAt,
          version: s.version,
        });
      }

      const actRows = await ctx.db
        .query('splitGroupActivity')
        .withIndex('by_group', (q) => q.eq('groupId', gid))
        .collect();
      for (const a of actRows) {
        activityOut.push({
          id: a._id as string,
          groupId: gid as string,
          kind: a.kind,
          at: a.at,
          actorMemberId: a.actorMemberId,
          expenseId: a.expenseId,
          settlementId: a.settlementId,
          targetMemberId: a.targetMemberId,
          title: a.title,
          subtitle: a.subtitle,
          amountMinor: a.amountMinor,
        });
      }
    }

    activityOut.sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime());

    return { groups, expenses: expensesOut, settlements: settlementsOut, activityLog: activityOut };
  },
});

export const createGroup = mutation({
  args: {
    name: v.string(),
    memberNames: v.optional(v.array(v.string())),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const trimmed = args.name.trim();
    if (!trimmed) throw new ConvexError('Group name required.');

    const user = await ctx.db.get(userId);
    const displayName = user?.name?.trim() || 'You';
    const now = Date.now();
    const currencyStored = normalizedGroupCurrency(args.currency);

    const groupId = await ctx.db.insert('splitGroups', {
      name: trimmed,
      currency: currencyStored,
      createdByUserId: userId,
      createdAt: now,
      updatedAt: now,
      version: 1,
    });

    const creatorMemberId = await ctx.db.insert('splitGroupMembers', {
      groupId,
      userId,
      displayName,
      isPlaceholder: false,
      joinedAt: now,
    });

    const memberRowsForReconcile: GroupMember[] = [
      {
        id: creatorMemberId as string,
        displayName,
        isCurrentUser: true,
        avatarUri:
          typeof user?.image === 'string' && user.image.length > 0 ? user.image : undefined,
        joinedAt: isoFromMs(now),
      },
    ];

    for (const raw of args.memberNames ?? []) {
      const n = raw.trim();
      if (!n) continue;
      const dup = memberRowsForReconcile.some((m) => m.displayName.toLowerCase() === n.toLowerCase());
      if (dup) continue;
      const mid = await ctx.db.insert('splitGroupMembers', {
        groupId,
        displayName: n,
        isPlaceholder: true,
        joinedAt: now,
      });
      memberRowsForReconcile.push({
        id: mid as string,
        displayName: n,
        isCurrentUser: false,
        joinedAt: isoFromMs(now),
      });

      await ctx.db.insert('splitGroupActivity', {
        groupId,
        kind: 'member_joined',
        at: isoFromMs(now),
        actorMemberId: creatorMemberId as string,
        targetMemberId: mid as string,
        title: `${n} joined`,
        subtitle: 'Added to group',
      });
    }

    const code = secureInviteCode();
    await ctx.db.insert('splitGroupInvites', {
      groupId,
      code,
      createdAt: now,
    });

    await ctx.db.insert('splitGroupActivity', {
      groupId,
      kind: 'group_created',
      at: isoFromMs(now),
      actorMemberId: creatorMemberId as string,
      title: `You created ${trimmed}`,
    });

    return { groupId: groupId as string, inviteCode: code };
  },
});

export const joinByInviteCode = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const userId = await requireUserId(ctx);
    const normalized = code.trim().toUpperCase();
    if (!normalized) throw new ConvexError('Invite code required.');

    const invite = await ctx.db
      .query('splitGroupInvites')
      .withIndex('by_code', (q) => q.eq('code', normalized))
      .first();

    if (!invite || invite.revokedAt != null) {
      throw new ConvexError('Invalid or expired invite.');
    }

    const groupId = invite.groupId as Id<'splitGroups'>;
    const existing = await ctx.db
      .query('splitGroupMembers')
      .withIndex('by_group', (q) => q.eq('groupId', groupId))
      .collect();
    const already = existing.find((m) => m.userId === userId);
    if (already) return { groupId: groupId as string };

    const user = await ctx.db.get(userId);
    const displayName = user?.name?.trim() || 'You';
    const now = Date.now();
    const nowIso = isoFromMs(now);

    const rosterBefore: GroupMember[] = await Promise.all(
      existing.map(async (r) => {
        let avatarUri: string | undefined;
        if (r.userId) {
          const uRow = await ctx.db.get(r.userId);
          const img = uRow?.image;
          avatarUri = typeof img === 'string' && img.length > 0 ? img : undefined;
        }
        return {
          id: r._id as string,
          displayName: r.displayName,
          isCurrentUser: r.userId === userId,
          avatarUri,
          joinedAt: isoFromMs(r.joinedAt),
        };
      })
    );

    const newMemberId = await ctx.db.insert('splitGroupMembers', {
      groupId,
      userId,
      displayName,
      isPlaceholder: false,
      joinedAt: now,
    });

    const expenseRows = await ctx.db
      .query('splitGroupExpenses')
      .withIndex('by_group', (q) => q.eq('groupId', groupId))
      .collect();

    const mappedExpenses: GroupExpense[] = expenseRows.map((e) => ({
      id: e._id as string,
      groupId: groupId as string,
      title: e.title,
      amountMinor: e.amountMinor,
      currency: e.currency,
      paidByMemberId: e.paidByMemberId,
      splitMethod: e.splitMethod,
      shares: e.shares,
      includedMemberIds: e.includedMemberIds,
      note: e.note,
      receiptUri: e.receiptUri,
      expenseDate: e.expenseDate,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
      version: e.version,
      deletedAt: e.deletedAt,
    }));

    const reconciled = reconcileExpenseSplitsWhenMemberJoins({
      expenses: mappedExpenses,
      groupId: groupId as string,
      rosterBeforeIncoming: rosterBefore,
      incomingMemberId: newMemberId as string,
      nowIso,
    });

    for (const row of expenseRows) {
      const next = reconciled.find((x) => x.id === (row._id as string));
      if (next && JSON.stringify(next.shares) !== JSON.stringify(row.shares)) {
        await ctx.db.patch(row._id, {
          includedMemberIds: next.includedMemberIds,
          shares: next.shares,
          updatedAt: next.updatedAt,
          version: next.version,
        });
      }
    }

    const g = await ctx.db.get(groupId);
    if (g) {
      await ctx.db.patch(groupId, {
        updatedAt: now,
        version: g.version + 1,
      });
    }

    await ctx.db.insert('splitGroupActivity', {
      groupId,
      kind: 'member_joined',
      at: nowIso,
      actorMemberId: newMemberId as string,
      targetMemberId: newMemberId as string,
      title: `${displayName} joined`,
      subtitle: 'Joined via invite',
    });

    return { groupId: groupId as string };
  },
});

export const regenerateInvite = mutation({
  args: { groupId: v.id('splitGroups') },
  handler: async (ctx, { groupId }) => {
    const userId = await requireUserId(ctx);
    await assertMember(ctx, groupId, userId);

    const invites = await ctx.db
      .query('splitGroupInvites')
      .withIndex('by_group', (q) => q.eq('groupId', groupId))
      .collect();
    const now = Date.now();
    for (const inv of invites) {
      if (inv.revokedAt == null) {
        await ctx.db.patch(inv._id, { revokedAt: now });
      }
    }
    const code = secureInviteCode();
    await ctx.db.insert('splitGroupInvites', {
      groupId,
      code,
      createdAt: now,
    });

    const g = await ctx.db.get(groupId);
    if (g) {
      await ctx.db.patch(groupId, { updatedAt: now, version: g.version + 1 });
    }

    return { inviteCode: code };
  },
});

export const updateGroup = mutation({
  args: {
    groupId: v.id('splitGroups'),
    name: v.optional(v.string()),
  },
  handler: async (ctx, { groupId, name }) => {
    const userId = await requireUserId(ctx);
    await assertMember(ctx, groupId, userId);
    const g = await ctx.db.get(groupId);
    if (!g) throw new ConvexError('Group not found.');
    const now = Date.now();
    const nowIso = isoFromMs(now);
    const actorId = await viewerMemberId(ctx, groupId, userId);

    if (name !== undefined) {
      const t = name.trim();
      if (!t) throw new ConvexError('Name required.');
      if (t !== g.name) {
        await ctx.db.patch(groupId, {
          name: t,
          updatedAt: now,
          version: g.version + 1,
        });
        await ctx.db.insert('splitGroupActivity', {
          groupId,
          kind: 'group_updated',
          at: nowIso,
          actorMemberId: actorId,
          title: `Name: ${g.name} → ${t}`,
          subtitle: 'Group updated',
        });
      }
    }

    return null;
  },
});

export const generateGroupImageUploadUrl = mutation({
  args: { groupId: v.id('splitGroups') },
  handler: async (ctx, { groupId }) => {
    const userId = await requireUserId(ctx);
    await assertMember(ctx, groupId, userId);
    return await ctx.storage.generateUploadUrl();
  },
});

export const finalizeGroupImageUpload = mutation({
  args: {
    groupId: v.id('splitGroups'),
    storageId: v.id('_storage'),
  },
  handler: async (ctx, { groupId, storageId }) => {
    const userId = await requireUserId(ctx);
    await assertMember(ctx, groupId, userId);
    const g = await ctx.db.get(groupId);
    if (!g) throw new ConvexError('Group not found.');
    const now = Date.now();
    const nowIso = isoFromMs(now);
    const actorId = await viewerMemberId(ctx, groupId, userId);

    await ctx.db.patch(groupId, {
      imageStorageId: storageId,
      updatedAt: now,
      version: g.version + 1,
    });

    await ctx.db.insert('splitGroupActivity', {
      groupId,
      kind: 'group_updated',
      at: nowIso,
      actorMemberId: actorId,
      title: 'Group photo updated',
      subtitle: 'Group updated',
    });

    return null;
  },
});

export const clearGroupImage = mutation({
  args: { groupId: v.id('splitGroups') },
  handler: async (ctx, { groupId }) => {
    const userId = await requireUserId(ctx);
    await assertMember(ctx, groupId, userId);
    const g = await ctx.db.get(groupId);
    if (!g) throw new ConvexError('Group not found.');
    const now = Date.now();
    const nowIso = isoFromMs(now);
    const actorId = await viewerMemberId(ctx, groupId, userId);

    await ctx.db.patch(groupId, {
      imageStorageId: undefined,
      updatedAt: now,
      version: g.version + 1,
    });

    await ctx.db.insert('splitGroupActivity', {
      groupId,
      kind: 'group_updated',
      at: nowIso,
      actorMemberId: actorId,
      title: 'Group photo removed',
      subtitle: 'Group updated',
    });

    return null;
  },
});

export const deleteGroup = mutation({
  args: { groupId: v.id('splitGroups') },
  handler: async (ctx, { groupId }) => {
    const userId = await requireUserId(ctx);
    const g = await ctx.db.get(groupId);
    if (!g) return null;
    if (g.createdByUserId !== userId) {
      throw new ConvexError('Only the host can delete this group.');
    }

    const expenses = await ctx.db
      .query('splitGroupExpenses')
      .withIndex('by_group', (q) => q.eq('groupId', groupId))
      .collect();
    for (const e of expenses) await ctx.db.delete(e._id);

    const settlements = await ctx.db
      .query('splitGroupSettlements')
      .withIndex('by_group', (q) => q.eq('groupId', groupId))
      .collect();
    for (const s of settlements) await ctx.db.delete(s._id);

    const activity = await ctx.db
      .query('splitGroupActivity')
      .withIndex('by_group', (q) => q.eq('groupId', groupId))
      .collect();
    for (const a of activity) await ctx.db.delete(a._id);

    const members = await ctx.db
      .query('splitGroupMembers')
      .withIndex('by_group', (q) => q.eq('groupId', groupId))
      .collect();
    for (const m of members) await ctx.db.delete(m._id);

    const invites = await ctx.db
      .query('splitGroupInvites')
      .withIndex('by_group', (q) => q.eq('groupId', groupId))
      .collect();
    for (const inv of invites) await ctx.db.delete(inv._id);

    await ctx.db.delete(groupId);
    return null;
  },
});

export const addPlaceholderMember = mutation({
  args: {
    groupId: v.id('splitGroups'),
    displayName: v.string(),
  },
  handler: async (ctx, { groupId, displayName }) => {
    const userId = await requireUserId(ctx);
    await assertMember(ctx, groupId, userId);
    const trimmed = displayName.trim();
    if (!trimmed) throw new ConvexError('Name required.');

    const existing = await loadMembers(ctx, groupId);
    const dup = existing.find((m: { displayName: string }) => m.displayName.toLowerCase() === trimmed.toLowerCase());
    if (dup) return { memberId: dup._id as string };

    const now = Date.now();
    const nowIso = isoFromMs(now);
    const actorId = await viewerMemberId(ctx, groupId, userId);

    const rosterBefore: GroupMember[] = existing.map((r: (typeof existing)[number]) => ({
      id: r._id as string,
      displayName: r.displayName,
      isCurrentUser: r.userId === userId,
      joinedAt: isoFromMs(r.joinedAt),
    }));

    const mid = await ctx.db.insert('splitGroupMembers', {
      groupId,
      displayName: trimmed,
      isPlaceholder: true,
      joinedAt: now,
    });

    const expenseRows = await ctx.db
      .query('splitGroupExpenses')
      .withIndex('by_group', (q) => q.eq('groupId', groupId))
      .collect();
    const mappedExpenses: GroupExpense[] = expenseRows.map((e) => ({
      id: e._id as string,
      groupId: groupId as string,
      title: e.title,
      amountMinor: e.amountMinor,
      currency: e.currency,
      paidByMemberId: e.paidByMemberId,
      splitMethod: e.splitMethod,
      shares: e.shares,
      includedMemberIds: e.includedMemberIds,
      note: e.note,
      receiptUri: e.receiptUri,
      expenseDate: e.expenseDate,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
      version: e.version,
      deletedAt: e.deletedAt,
    }));

    const reconciled = reconcileExpenseSplitsWhenMemberJoins({
      expenses: mappedExpenses,
      groupId: groupId as string,
      rosterBeforeIncoming: rosterBefore,
      incomingMemberId: mid as string,
      nowIso,
    });

    for (const row of expenseRows) {
      const next = reconciled.find((x) => x.id === (row._id as string));
      if (next && JSON.stringify(next.shares) !== JSON.stringify(row.shares)) {
        await ctx.db.patch(row._id, {
          includedMemberIds: next.includedMemberIds,
          shares: next.shares,
          updatedAt: next.updatedAt,
          version: next.version,
        });
      }
    }

    const g = await ctx.db.get(groupId);
    if (g) {
      await ctx.db.patch(groupId, { updatedAt: now, version: g.version + 1 });
    }

    await ctx.db.insert('splitGroupActivity', {
      groupId,
      kind: 'member_joined',
      at: nowIso,
      actorMemberId: actorId,
      targetMemberId: mid as string,
      title: `${trimmed} joined`,
      subtitle: 'Added to group',
    });

    return { memberId: mid as string };
  },
});

export const renameMember = mutation({
  args: {
    groupId: v.id('splitGroups'),
    memberId: v.string(),
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await assertMember(ctx, args.groupId, userId);

    const row = await ctx.db.get(args.memberId as Id<'splitGroupMembers'>);
    if (!row || row.groupId !== args.groupId) throw new ConvexError('Member not found.');
    if (row.userId === userId) throw new ConvexError('Cannot rename yourself here.');

    const trimmed = args.displayName.trim();
    if (!trimmed) throw new ConvexError('Name required.');

    const members = await loadMembers(ctx, args.groupId);
    const dup = members.find(
      (m: { _id: Id<'splitGroupMembers'>; displayName: string }) =>
        m._id !== row._id && m.displayName.toLowerCase() === trimmed.toLowerCase()
    );
    if (dup) throw new ConvexError('A member with this name already exists.');

    const nowIso = isoFromMs(Date.now());
    const actorId = await viewerMemberId(ctx, args.groupId, userId);

    await ctx.db.patch(row._id, { displayName: trimmed });

    const g = await ctx.db.get(args.groupId);
    if (g) {
      await ctx.db.patch(args.groupId, {
        updatedAt: Date.now(),
        version: g.version + 1,
      });
    }

    await ctx.db.insert('splitGroupActivity', {
      groupId: args.groupId,
      kind: 'member_renamed',
      at: nowIso,
      actorMemberId: actorId,
      targetMemberId: row._id as string,
      title: `Renamed member`,
      subtitle: `${row.displayName} → ${trimmed}`,
    });

    return null;
  },
});

export const removeMember = mutation({
  args: {
    groupId: v.id('splitGroups'),
    memberId: v.string(),
  },
  handler: async (ctx, { groupId, memberId }) => {
    const userId = await requireUserId(ctx);
    await assertMember(ctx, groupId, userId);

    const row = await ctx.db.get(memberId as Id<'splitGroupMembers'>);
    if (!row || row.groupId !== groupId) throw new ConvexError('Member not found.');
    if (row.userId === userId) throw new ConvexError('Cannot remove yourself.');

    const nowIso = isoFromMs(Date.now());
    const actorId = await viewerMemberId(ctx, groupId, userId);

    const expenseRows = await ctx.db
      .query('splitGroupExpenses')
      .withIndex('by_group', (q) => q.eq('groupId', groupId))
      .collect();

    for (const e of expenseRows) {
      if (e.deletedAt) continue;
      await ctx.db.patch(e._id, {
        includedMemberIds: e.includedMemberIds.filter((id) => id !== memberId),
        shares: e.shares.filter((s) => s.memberId !== memberId),
        updatedAt: nowIso,
        version: e.version + 1,
      });
    }

    await ctx.db.delete(row._id);

    const g = await ctx.db.get(groupId);
    if (g) {
      await ctx.db.patch(groupId, {
        updatedAt: Date.now(),
        version: g.version + 1,
      });
    }

    await ctx.db.insert('splitGroupActivity', {
      groupId,
      kind: 'member_removed',
      at: nowIso,
      actorMemberId: actorId,
      targetMemberId: memberId,
      title: `${row.displayName} removed`,
    });

    return null;
  },
});

export const addExpense = mutation({
  args: {
    groupId: v.id('splitGroups'),
    title: v.string(),
    amount: v.number(),
    paidByMemberId: v.string(),
    splitMethod: splitMethodValidator,
    includedMemberIds: v.array(v.string()),
    shares: v.optional(v.array(expenseShareValidator)),
    note: v.optional(v.string()),
    receiptUri: v.optional(v.string()),
    expenseDate: v.optional(v.string()),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await assertMember(ctx, args.groupId, userId);

    const groupRowForCurrency = await ctx.db.get(args.groupId);
    if (!groupRowForCurrency) throw new ConvexError('Group not found.');

    const members = await loadMembers(ctx, args.groupId);
    const memberIds = new Set<string>(
      members.map((m: { _id: Id<'splitGroupMembers'> }) => m._id as string)
    );
    if (!memberIds.has(args.paidByMemberId)) throw new ConvexError('Invalid payer.');

    const amountMinor = amountToMinor(args.amount);
    const rawIncluded = args.includedMemberIds as string[];
    const included: string[] =
      rawIncluded.length > 0 ? rawIncluded : Array.from(memberIds);
    for (const id of included) {
      if (!memberIds.has(id)) throw new ConvexError('Invalid participant.');
    }

    const shares =
      args.shares ?? createDefaultShares(args.splitMethod, included, amountMinor);

    const err = validateExpenseShares(amountMinor, args.splitMethod, included, shares);
    if (err) throw new ConvexError(err);

    const nowIso = isoFromMs(Date.now());
    const expenseDate = args.expenseDate ?? nowIso;
    const expenseCurrency =
      typeof groupRowForCurrency.currency === 'string' &&
      groupRowForCurrency.currency.trim().length >= 3
        ? normalizedGroupCurrency(groupRowForCurrency.currency)
        : normalizedGroupCurrency(args.currency);
    const actorId = await viewerMemberId(ctx, args.groupId, userId);

    const id = await ctx.db.insert('splitGroupExpenses', {
      groupId: args.groupId,
      title: args.title.trim(),
      amountMinor,
      currency: expenseCurrency,
      paidByMemberId: args.paidByMemberId,
      splitMethod: args.splitMethod,
      shares,
      includedMemberIds: included,
      note: args.note?.trim() || undefined,
      receiptUri: args.receiptUri,
      expenseDate,
      createdAt: nowIso,
      updatedAt: nowIso,
      version: 1,
    });

    const payerName =
      members.find((m: { _id: Id<'splitGroupMembers'> }) => (m._id as string) === args.paidByMemberId)
        ?.displayName ?? 'Someone';

    await ctx.db.insert('splitGroupActivity', {
      groupId: args.groupId,
      kind: 'expense_added',
      at: nowIso,
      actorMemberId: actorId,
      expenseId: id as string,
      title: args.title.trim(),
      subtitle: `${payerName} paid`,
      amountMinor,
    });

    const g = await ctx.db.get(args.groupId);
    if (g) {
      await ctx.db.patch(args.groupId, {
        updatedAt: Date.now(),
        version: g.version + 1,
      });
    }

    return { expenseId: id as string };
  },
});

export const updateExpense = mutation({
  args: {
    expenseId: v.id('splitGroupExpenses'),
    title: v.optional(v.string()),
    amount: v.optional(v.number()),
    paidByMemberId: v.optional(v.string()),
    splitMethod: v.optional(splitMethodValidator),
    includedMemberIds: v.optional(v.array(v.string())),
    shares: v.optional(v.array(expenseShareValidator)),
    note: v.optional(v.string()),
    receiptUri: v.optional(v.string()),
    expenseDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db.get(args.expenseId);
    if (!existing || existing.deletedAt) throw new ConvexError('Expense not found.');

    await assertMember(ctx, existing.groupId, userId);

    const members = await loadMembers(ctx, existing.groupId);
    const memberIds = new Set(members.map((m: { _id: Id<'splitGroupMembers'> }) => m._id as string));

    const amountMinor =
      args.amount != null ? amountToMinor(args.amount) : existing.amountMinor;
    const splitMethod = args.splitMethod ?? existing.splitMethod;
    const included: string[] =
      args.includedMemberIds != null
        ? (args.includedMemberIds as string[])
        : (existing.includedMemberIds as unknown as string[]);
    for (const id of included) {
      if (!memberIds.has(id)) throw new ConvexError('Invalid participant.');
    }

    const paidBy = args.paidByMemberId ?? existing.paidByMemberId;
    if (!memberIds.has(paidBy)) throw new ConvexError('Invalid payer.');

    const shares =
      args.shares ?? createDefaultShares(splitMethod, included, amountMinor);

    const err = validateExpenseShares(amountMinor, splitMethod, included, shares);
    if (err) throw new ConvexError(err);

    const nowIso = isoFromMs(Date.now());
    const actorId = await viewerMemberId(ctx, existing.groupId, userId);

    await ctx.db.patch(args.expenseId, {
      title: args.title?.trim() ?? existing.title,
      amountMinor,
      paidByMemberId: paidBy,
      splitMethod,
      shares,
      includedMemberIds: included,
      note: args.note !== undefined ? args.note?.trim() || undefined : existing.note,
      receiptUri: args.receiptUri !== undefined ? args.receiptUri : existing.receiptUri,
      expenseDate: args.expenseDate ?? existing.expenseDate,
      updatedAt: nowIso,
      version: existing.version + 1,
    });

    await ctx.db.insert('splitGroupActivity', {
      groupId: existing.groupId,
      kind: 'expense_edited',
      at: nowIso,
      actorMemberId: actorId,
      expenseId: args.expenseId as string,
      title: args.title?.trim() ?? existing.title,
      subtitle: 'Expense updated',
      amountMinor,
    });

    const g = await ctx.db.get(existing.groupId);
    if (g) {
      await ctx.db.patch(existing.groupId, {
        updatedAt: Date.now(),
        version: g.version + 1,
      });
    }

    return null;
  },
});

export const deleteExpense = mutation({
  args: { expenseId: v.id('splitGroupExpenses') },
  handler: async (ctx, { expenseId }) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db.get(expenseId);
    if (!existing || existing.deletedAt) throw new ConvexError('Expense not found.');
    await assertMember(ctx, existing.groupId, userId);

    const nowIso = isoFromMs(Date.now());
    const actorId = await viewerMemberId(ctx, existing.groupId, userId);

    await ctx.db.patch(expenseId, {
      deletedAt: nowIso,
      updatedAt: nowIso,
      version: existing.version + 1,
    });

    await ctx.db.insert('splitGroupActivity', {
      groupId: existing.groupId,
      kind: 'expense_deleted',
      at: nowIso,
      actorMemberId: actorId,
      expenseId: expenseId as string,
      title: existing.title,
      subtitle: 'Expense deleted',
      amountMinor: existing.amountMinor,
    });

    const g = await ctx.db.get(existing.groupId);
    if (g) {
      await ctx.db.patch(existing.groupId, {
        updatedAt: Date.now(),
        version: g.version + 1,
      });
    }

    return null;
  },
});

export const recordSettlement = mutation({
  args: {
    groupId: v.id('splitGroups'),
    fromMemberId: v.string(),
    toMemberId: v.string(),
    amount: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await assertMember(ctx, args.groupId, userId);

    if (args.fromMemberId === args.toMemberId) {
      throw new ConvexError('Choose different members.');
    }

    const amountMinor = amountToMinor(args.amount);
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
      throw new ConvexError('Enter an amount greater than 0.');
    }
    if (amountMinor > MAX_INPUT_AMOUNT_MINOR) {
      throw new ConvexError('Amount is too large.');
    }

    const expenseRows = await ctx.db
      .query('splitGroupExpenses')
      .withIndex('by_group', (q) => q.eq('groupId', args.groupId))
      .collect();
    const settlementRows = await ctx.db
      .query('splitGroupSettlements')
      .withIndex('by_group', (q) => q.eq('groupId', args.groupId))
      .collect();

    const expenses: GroupExpense[] = expenseRows.map((e) => ({
      id: e._id as string,
      groupId: args.groupId as string,
      title: e.title,
      amountMinor: e.amountMinor,
      currency: e.currency,
      paidByMemberId: e.paidByMemberId,
      splitMethod: e.splitMethod,
      shares: e.shares,
      includedMemberIds: e.includedMemberIds,
      note: e.note,
      receiptUri: e.receiptUri,
      expenseDate: e.expenseDate,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
      version: e.version,
      deletedAt: e.deletedAt,
    }));

    const settlements: Settlement[] = settlementRows.map((s) => ({
      id: s._id as string,
      groupId: args.groupId as string,
      fromMemberId: s.fromMemberId,
      toMemberId: s.toMemberId,
      amountMinor: s.amountMinor,
      note: s.note,
      settledAt: s.settledAt,
      version: s.version,
    }));

    const cap = getDirectedOutstandingMinor(
      expenses,
      settlements,
      args.groupId as string,
      args.fromMemberId,
      args.toMemberId
    );
    if (cap <= 0) {
      throw new ConvexError('That balance is already settled up for this payer and recipient.');
    }
    if (amountMinor > cap) {
      throw new ConvexError('That amount is more than what is still owed for this payer and recipient.');
    }

    const nowIso = isoFromMs(Date.now());
    const actorId = await viewerMemberId(ctx, args.groupId, userId);

    const sid = await ctx.db.insert('splitGroupSettlements', {
      groupId: args.groupId,
      fromMemberId: args.fromMemberId,
      toMemberId: args.toMemberId,
      amountMinor,
      note: args.note?.trim() || undefined,
      settledAt: nowIso,
      version: 1,
    });

    await ctx.db.insert('splitGroupActivity', {
      groupId: args.groupId,
      kind: 'settlement_recorded',
      at: nowIso,
      actorMemberId: actorId,
      settlementId: sid as string,
      title: 'Settlement recorded',
      subtitle: undefined,
      amountMinor,
    });

    const g = await ctx.db.get(args.groupId);
    if (g) {
      await ctx.db.patch(args.groupId, {
        updatedAt: Date.now(),
        version: g.version + 1,
      });
    }

    return { settlementId: sid as string };
  },
});

export const voidRecordedSettlementsWithMember = mutation({
  args: {
    groupId: v.id('splitGroups'),
    viewerMemberId: v.string(),
    otherMemberId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await assertMember(ctx, args.groupId, userId);

    const vm = await ctx.db.get(args.viewerMemberId as Id<'splitGroupMembers'>);
    if (!vm || vm.userId !== userId) throw new ConvexError('Invalid viewer member.');

    const settlements = await ctx.db
      .query('splitGroupSettlements')
      .withIndex('by_group', (q) => q.eq('groupId', args.groupId))
      .collect();

    const removed = settlements.filter(
      (s) =>
        (s.fromMemberId === args.viewerMemberId && s.toMemberId === args.otherMemberId) ||
        (s.fromMemberId === args.otherMemberId && s.toMemberId === args.viewerMemberId)
    );

    if (removed.length === 0) return null;

    const nowIso = isoFromMs(Date.now());
    const actorId = await viewerMemberId(ctx, args.groupId, userId);

    for (const s of removed) {
      await ctx.db.delete(s._id);
    }

    await ctx.db.insert('splitGroupActivity', {
      groupId: args.groupId,
      kind: 'settlements_voided',
      at: nowIso,
      actorMemberId: actorId,
      targetMemberId: args.otherMemberId,
      title: `Voided ${removed.length} settlement(s)`,
    });

    const g = await ctx.db.get(args.groupId);
    if (g) {
      await ctx.db.patch(args.groupId, {
        updatedAt: Date.now(),
        version: g.version + 1,
      });
    }

    return null;
  },
});

export const recordAllViewerPairwiseSettlements = mutation({
  args: {
    groupId: v.id('splitGroups'),
    viewerMemberId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await assertMember(ctx, args.groupId, userId);

    const vm = await ctx.db.get(args.viewerMemberId as Id<'splitGroupMembers'>);
    if (!vm || vm.userId !== userId) throw new ConvexError('Invalid viewer member.');

    const grpHead = await ctx.db.get(args.groupId);
    const memberRows = await loadMembers(ctx, args.groupId);
    const splitGroup: SplitGroup = {
      id: args.groupId as string,
      name: '',
      currency: normalizedGroupCurrency((grpHead as { currency?: string } | null)?.currency),
      inviteCode: '',
      members: memberRows.map((r: (typeof memberRows)[number]) => ({
        id: r._id as string,
        displayName: r.displayName,
        isCurrentUser: r.userId === userId,
        joinedAt: isoFromMs(r.joinedAt),
      })),
      createdAt: '',
      updatedAt: '',
      version: 1,
    };

    const expenseRows = await ctx.db
      .query('splitGroupExpenses')
      .withIndex('by_group', (q) => q.eq('groupId', args.groupId))
      .collect();
    const settlementRows = await ctx.db
      .query('splitGroupSettlements')
      .withIndex('by_group', (q) => q.eq('groupId', args.groupId))
      .collect();

    const expenses: GroupExpense[] = expenseRows.map((e) => ({
      id: e._id as string,
      groupId: args.groupId as string,
      title: e.title,
      amountMinor: e.amountMinor,
      currency: e.currency,
      paidByMemberId: e.paidByMemberId,
      splitMethod: e.splitMethod,
      shares: e.shares,
      includedMemberIds: e.includedMemberIds,
      note: e.note,
      receiptUri: e.receiptUri,
      expenseDate: e.expenseDate,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
      version: e.version,
      deletedAt: e.deletedAt,
    }));

    let settlements: Settlement[] = settlementRows.map((s) => ({
      id: s._id as string,
      groupId: args.groupId as string,
      fromMemberId: s.fromMemberId,
      toMemberId: s.toMemberId,
      amountMinor: s.amountMinor,
      note: s.note,
      settledAt: s.settledAt,
      version: s.version,
    }));

    const snap = selectGroupBalances(splitGroup, expenses, settlements);
    const cu = args.viewerMemberId;
    const nowIso = isoFromMs(Date.now());
    const actorId = await viewerMemberId(ctx, args.groupId, userId);

    for (const b of snap.memberBalances) {
      if (b.memberId === cu || b.netMinor === 0) continue;
      const fromMemberId = b.netMinor > 0 ? b.memberId : cu;
      const toMemberId = b.netMinor > 0 ? cu : b.memberId;
      const capMinor = getDirectedOutstandingMinor(
        expenses,
        settlements,
        args.groupId as string,
        fromMemberId,
        toMemberId
      );
      const amountMinor = Math.min(Math.abs(b.netMinor), capMinor);
      if (amountMinor <= 0) continue;

      const sid = await ctx.db.insert('splitGroupSettlements', {
        groupId: args.groupId,
        fromMemberId,
        toMemberId,
        amountMinor,
        settledAt: nowIso,
        version: 1,
      });

      const st: Settlement = {
        id: sid as string,
        groupId: args.groupId as string,
        fromMemberId,
        toMemberId,
        amountMinor,
        settledAt: nowIso,
        version: 1,
      };
      settlements = [st, ...settlements];

      await ctx.db.insert('splitGroupActivity', {
        groupId: args.groupId,
        kind: 'settlement_recorded',
        at: nowIso,
        actorMemberId: actorId,
        settlementId: sid as string,
        title: 'Settlement recorded',
        amountMinor,
      });
    }

    const g = await ctx.db.get(args.groupId);
    if (g) {
      await ctx.db.patch(args.groupId, {
        updatedAt: Date.now(),
        version: g.version + 1,
      });
    }

    return null;
  },
});
