import { getAuthUserId } from '@convex-dev/auth/server';
import { ConvexError, v } from 'convex/values';

import type {
  GroupExpense,
  GroupMember,
  Settlement,
  SplitGroup,
  SplitMethod,
} from './groupDomain';
import {
  amountToMinor,
  createDefaultShares,
  getDirectedOutstandingMinor,
  selectGroupBalances,
  validateExpenseShares,
} from './balanceEngine';
import { reconcileExpenseSplitsWhenMemberJoins } from './memberJoinExpenseSplit';
import type { Doc, Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import { formatMinorAudit, MAX_INPUT_AMOUNT_MINOR } from './moneyConvex';

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

const INVITE_CODE_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function randomSixCharInviteCode(): string {
  const buf = new Uint8Array(6);
  crypto.getRandomValues(buf);
  let s = '';
  for (let i = 0; i < 6; i++) {
    s += INVITE_CODE_ALPHABET[buf[i]! % INVITE_CODE_ALPHABET.length]!;
  }
  return s;
}

async function allocateUniqueInviteCode(ctx: any): Promise<string> {
  for (let attempt = 0; attempt < 32; attempt++) {
    const code = randomSixCharInviteCode();
    const existing = await ctx.db
      .query('splitGroupInvites')
      .withIndex('by_code', (q: any) => q.eq('code', code))
      .first();
    if (!existing) return code;
  }
  throw new ConvexError('Could not allocate invite code.');
}

function isoFromMs(ms: number): string {
  return new Date(ms).toISOString();
}

function convexMemberDisplayName(row: { displayName?: string } | null | undefined): string {
  const t = row?.displayName?.trim();
  return t && t.length > 0 ? t : 'Someone';
}

function convexMemberSettledName(rows: readonly { _id: unknown; displayName: string }[], id: string): string {
  const r = rows.find((m) => (m._id as string) === id);
  return convexMemberDisplayName(r ?? null);
}

function splitMethodConvexLabel(method: SplitMethod): string {
  switch (method) {
    case 'exact':
      return 'Custom split';
    case 'percentage':
      return 'Percent split';
    case 'shares':
      return 'Share split';
    case 'adjustment':
      return 'Adjustment split';
    case 'equal':
    default:
      return 'Equal split';
  }
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

/** Legacy groups may lack an invite row; allocate one so shared codes always resolve. */
async function ensureActiveInviteCode(ctx: any, groupId: Id<'splitGroups'>): Promise<string> {
  const existing = await getActiveInviteCode(ctx, groupId);
  if (existing) return existing;
  const code = await allocateUniqueInviteCode(ctx);
  await ctx.db.insert('splitGroupInvites', {
    groupId,
    code,
    createdAt: Date.now(),
  });
  return code;
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

async function assertGroupHost(ctx: any, groupId: Id<'splitGroups'>, userId: Id<'users'>): Promise<void> {
  const g = await ctx.db.get(groupId);
  if (!g) throw new ConvexError('Group not found.');
  if (g.createdByUserId !== userId) {
    throw new ConvexError('Only the group host can do that.');
  }
}

async function viewerMemberId(ctx: any, groupId: Id<'splitGroups'>, userId: Id<'users'>): Promise<string> {
  const members = await loadMembers(ctx, groupId);
  const row = members.find((m: { userId?: Id<'users'> }) => m.userId === userId);
  if (!row) throw new ConvexError('Not a member of this group.');
  return row._id as string;
}

function dedupePreserveOrder(ids: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function remapIdForPlaceholderMerge(memberId: string, viewerMemberId: string, placeholderMemberId: string): string {
  return memberId === viewerMemberId ? placeholderMemberId : memberId;
}

type ShareRowForMerge = NonNullable<GroupExpense['shares']>[number];

function consolidateExpenseSharesAfterIdMerge(splitMethod: SplitMethod, mapped: ShareRowForMerge[]): ShareRowForMerge[] {
  const byMember = new Map<string, ShareRowForMerge>();

  const mergeTwo = (a: ShareRowForMerge, b: ShareRowForMerge): ShareRowForMerge => {
    switch (splitMethod) {
      case 'equal':
        return { memberId: a.memberId };
      case 'exact':
        return {
          memberId: a.memberId,
          valueMinor: (a.valueMinor ?? 0) + (b.valueMinor ?? 0),
        };
      case 'percentage':
        return {
          memberId: a.memberId,
          percentBps: (a.percentBps ?? 0) + (b.percentBps ?? 0),
        };
      case 'shares':
        return {
          memberId: a.memberId,
          shareParts: (a.shareParts ?? 1) + (b.shareParts ?? 1),
        };
      case 'adjustment':
        return {
          memberId: a.memberId,
          adjustmentMinor: (a.adjustmentMinor ?? 0) + (b.adjustmentMinor ?? 0),
        };
      default:
        return { memberId: a.memberId };
    }
  };

  for (const row of mapped) {
    const existing = byMember.get(row.memberId);
    byMember.set(row.memberId, existing ? mergeTwo(existing, row) : { ...row });
  }

  const list = [...byMember.values()].sort((x, y) => x.memberId.localeCompare(y.memberId));
  return list;
}

function patchExpenseDocsForPlaceholderMerge(params: {
  expense: Doc<'splitGroupExpenses'>;
  viewerMemberId: string;
  placeholderMemberId: string;
  nowIso: string;
}) {
  const { expense: e, viewerMemberId: vm, placeholderMemberId: ph, nowIso } = params;

  const rid = (mid: string) => remapIdForPlaceholderMerge(mid, vm, ph);
  const included = dedupePreserveOrder(e.includedMemberIds.map(rid));

  let paidBy = rid(e.paidByMemberId);
  if (!included.some((id) => id === paidBy) && included.length > 0) paidBy = included[0];

  let shares = consolidateExpenseSharesAfterIdMerge(
    e.splitMethod as SplitMethod,
    e.shares.map((s) => ({ ...s, memberId: rid(s.memberId) }))
  ).filter((s) => included.includes(s.memberId));

  let validation = validateExpenseShares(e.amountMinor, e.splitMethod, included, shares);
  if (validation !== null) {
    shares = createDefaultShares(e.splitMethod, included, e.amountMinor);
    validation = validateExpenseShares(e.amountMinor, e.splitMethod, included, shares);
    if (validation !== null) {
      throw new ConvexError(`Could not reconcile expense "${e.title ?? ''}" after merging members: ${validation}`);
    }
  }

  const next = {
    paidByMemberId: paidBy,
    includedMemberIds: included,
    shares,
    updatedAt: nowIso,
    version: e.version + 1,
  };
  return next;
}

function mapMemberToClient(
  row: {
    _id: Id<'splitGroupMembers'>;
    userId?: Id<'users'>;
    displayName: string;
    joinedAt: number;
    isPlaceholder: boolean;
  },
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
    isPlaceholder: row.isPlaceholder,
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
  const inviteCode = await ensureActiveInviteCode(ctx, groupDoc._id);

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
        title: `${convexMemberDisplayName({ displayName })} added ${n}`,
        subtitle: 'Placeholder (not linked yet)',
      });
    }

    const code = await allocateUniqueInviteCode(ctx);
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
      title: `${convexMemberDisplayName({ displayName })} created ${trimmed}`,
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

    if (!invite) {
      throw new ConvexError('Invalid or expired invite.');
    }
    if (invite.revokedAt != null) {
      throw new ConvexError('This invite was replaced. Ask the host for a new link or code.');
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
      subtitle: `${displayName} accepted the invite`,
    });

    return { groupId: groupId as string };
  },
});

export const regenerateInvite = mutation({
  args: { groupId: v.id('splitGroups') },
  handler: async (ctx, { groupId }) => {
    const userId = await requireUserId(ctx);
    await assertMember(ctx, groupId, userId);
    await assertGroupHost(ctx, groupId, userId);

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
    const code = await allocateUniqueInviteCode(ctx);
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
        const memberRows = await loadMembers(ctx, groupId);
        const actorName = convexMemberSettledName(memberRows, actorId);
        await ctx.db.insert('splitGroupActivity', {
          groupId,
          kind: 'group_updated',
          at: nowIso,
          actorMemberId: actorId,
          title: `${actorName} updated the group name`,
          subtitle: `${g.name} → ${t}`,
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
    await assertGroupHost(ctx, groupId, userId);
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
    await assertGroupHost(ctx, groupId, userId);
    const g = await ctx.db.get(groupId);
    if (!g) throw new ConvexError('Group not found.');
    const now = Date.now();
    const nowIso = isoFromMs(now);
    const actorId = await viewerMemberId(ctx, groupId, userId);
    const memberRowsPhoto = await loadMembers(ctx, groupId);
    const actorPhoto = convexMemberSettledName(memberRowsPhoto, actorId);

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
      title: `${actorPhoto} updated cover photo`,
      subtitle: 'Photo saved for everyone in the group.',
    });

    return null;
  },
});

export const clearGroupImage = mutation({
  args: { groupId: v.id('splitGroups') },
  handler: async (ctx, { groupId }) => {
    const userId = await requireUserId(ctx);
    await assertMember(ctx, groupId, userId);
    await assertGroupHost(ctx, groupId, userId);
    const g = await ctx.db.get(groupId);
    if (!g) throw new ConvexError('Group not found.');
    const now = Date.now();
    const nowIso = isoFromMs(now);
    const actorId = await viewerMemberId(ctx, groupId, userId);
    const memberRowsClear = await loadMembers(ctx, groupId);
    const actorClear = convexMemberSettledName(memberRowsClear, actorId);

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
      title: `${actorClear} removed cover photo`,
      subtitle: 'Photo removed for everyone in the group.',
    });

    return null;
  },
});

export const generateExpenseReceiptUploadUrl = mutation({
  args: { groupId: v.id('splitGroups') },
  handler: async (ctx, { groupId }) => {
    const userId = await requireUserId(ctx);
    await assertMember(ctx, groupId, userId);
    return await ctx.storage.generateUploadUrl();
  },
});

export const finalizeExpenseReceiptUpload = mutation({
  args: {
    groupId: v.id('splitGroups'),
    storageId: v.id('_storage'),
  },
  handler: async (ctx, { groupId, storageId }) => {
    const userId = await requireUserId(ctx);
    await assertMember(ctx, groupId, userId);
    const url = await ctx.storage.getUrl(storageId);
    if (!url) {
      throw new ConvexError('Could not resolve uploaded receipt.');
    }
    return url;
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
    await assertGroupHost(ctx, groupId, userId);
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

    const actorAddPh = convexMemberSettledName(existing, actorId);

    await ctx.db.insert('splitGroupActivity', {
      groupId,
      kind: 'member_joined',
      at: nowIso,
      actorMemberId: actorId,
      targetMemberId: mid as string,
      title: `${actorAddPh} added ${trimmed}`,
      subtitle: 'Placeholder (not linked yet)',
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
    await assertGroupHost(ctx, args.groupId, userId);
    if (row.userId != null) {
      throw new ConvexError('Members with a Debtly account cannot be renamed.');
    }

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

    const actorRename = convexMemberSettledName(members, actorId);
    const previousDisplay = row.displayName;

    await ctx.db.insert('splitGroupActivity', {
      groupId: args.groupId,
      kind: 'member_renamed',
      at: nowIso,
      actorMemberId: actorId,
      targetMemberId: row._id as string,
      title: `${actorRename} renamed ${previousDisplay}`,
      subtitle: `${previousDisplay} → ${trimmed}`,
    });

    return null;
  },
});

/** Invited member merges their Convex account into an existing placeholder row they were meant to be. */
export const claimPlaceholderSeat = mutation({
  args: {
    groupId: v.id('splitGroups'),
    placeholderMemberId: v.string(),
  },
  handler: async (ctx, { groupId, placeholderMemberId }) => {
    const userId = await requireUserId(ctx);
    await assertMember(ctx, groupId, userId);

    const ph = await ctx.db.get(placeholderMemberId as Id<'splitGroupMembers'>);
    if (!ph || ph.groupId !== groupId) throw new ConvexError('Member not found.');
    if (!ph.isPlaceholder || ph.userId != null) {
      throw new ConvexError('This row is already a linked Debtly member, not a name-only placeholder.');
    }

    const members = await loadMembers(ctx, groupId);
    const viewerRow = members.find((m: { userId?: Id<'users'> }) => m.userId === userId);
    if (!viewerRow) throw new ConvexError('Not a member of this group.');

    const vmId = viewerRow._id as string;
    const phId = ph._id as string;
    if (vmId === phId) throw new ConvexError('Nothing to merge.');

    const now = Date.now();
    const nowIso = isoFromMs(now);

    const expenseRows = await ctx.db
      .query('splitGroupExpenses')
      .withIndex('by_group', (q: any) => q.eq('groupId', groupId))
      .collect();

    for (const e of expenseRows) {
      if (e.deletedAt) continue;
      const touches =
        e.paidByMemberId === vmId ||
        e.paidByMemberId === phId ||
        e.includedMemberIds.some((id) => id === vmId || id === phId) ||
        e.shares.some((s) => s.memberId === vmId || s.memberId === phId);
      if (!touches) continue;
      const patch = patchExpenseDocsForPlaceholderMerge({
        expense: e,
        viewerMemberId: vmId,
        placeholderMemberId: phId,
        nowIso,
      });
      await ctx.db.patch(e._id, patch);
    }

    const settlementRows = await ctx.db
      .query('splitGroupSettlements')
      .withIndex('by_group', (q: any) => q.eq('groupId', groupId))
      .collect();

    for (const s of settlementRows) {
      const nextFrom = remapIdForPlaceholderMerge(s.fromMemberId, vmId, phId);
      const nextTo = remapIdForPlaceholderMerge(s.toMemberId, vmId, phId);
      if (nextFrom === nextTo) {
        await ctx.db.delete(s._id);
        continue;
      }
      await ctx.db.patch(s._id, {
        fromMemberId: nextFrom,
        toMemberId: nextTo,
        version: s.version + 1,
      });
    }

    const activityRows = await ctx.db
      .query('splitGroupActivity')
      .withIndex('by_group', (q: any) => q.eq('groupId', groupId))
      .collect();

    for (const a of activityRows) {
      const nextActor = a.actorMemberId === vmId ? phId : a.actorMemberId;
      const rawTarget = a.targetMemberId;
      const nextTarget = rawTarget === vmId ? phId : rawTarget;
      if (nextActor === a.actorMemberId && nextTarget === a.targetMemberId) continue;
      await ctx.db.patch(a._id, {
        actorMemberId: nextActor,
        ...(nextTarget !== undefined ? { targetMemberId: nextTarget } : {}),
      });
    }

    const user = await ctx.db.get(userId);
    const mergedName =
      viewerRow.displayName?.trim() || user?.name?.trim() || ph.displayName;

    await ctx.db.patch(ph._id, {
      userId,
      displayName: mergedName.trim() || ph.displayName,
      isPlaceholder: false,
      joinedAt: Math.max(ph.joinedAt, viewerRow.joinedAt, now),
    });

    await ctx.db.delete(viewerRow._id);

    const gRow = await ctx.db.get(groupId);
    if (gRow) {
      await ctx.db.patch(groupId, {
        updatedAt: now,
        version: gRow.version + 1,
      });
    }

    const mergedDisplay =
      (mergedName.trim() || ph.displayName)?.trim() || convexMemberDisplayName(ph);
    const placeholderLabel = ph.displayName;

    await ctx.db.insert('splitGroupActivity', {
      groupId,
      kind: 'member_removed',
      at: nowIso,
      actorMemberId: phId,
      targetMemberId: vmId,
      title: `${mergedDisplay} linked their Debtly account`,
      subtitle: `Merged into the "${placeholderLabel}" seat; past splits stay on that member.`,
    });

    return { linkedMemberId: phId };
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
    await assertGroupHost(ctx, groupId, userId);

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

    const rosterForRemoval = await loadMembers(ctx, groupId);
    const removerName = convexMemberSettledName(rosterForRemoval, actorId);
    const removedMemberName = convexMemberDisplayName(row);

    await ctx.db.insert('splitGroupActivity', {
      groupId,
      kind: 'member_removed',
      at: nowIso,
      actorMemberId: actorId,
      targetMemberId: memberId,
      title: `${removerName} removed ${removedMemberName}`,
      subtitle: `${removedMemberName} was removed from the group.`,
    });

    await ctx.db.delete(row._id);

    const g = await ctx.db.get(groupId);
    if (g) {
      await ctx.db.patch(groupId, {
        updatedAt: Date.now(),
        version: g.version + 1,
      });
    }

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
      receiptUri: args.receiptUri?.trim() || undefined,
      expenseDate,
      createdAt: nowIso,
      updatedAt: nowIso,
      version: 1,
    });

    const payerName =
      members.find((m: { _id: Id<'splitGroupMembers'> }) => (m._id as string) === args.paidByMemberId)
        ?.displayName ?? 'Someone';
    const recorderName = convexMemberSettledName(members, actorId);

    await ctx.db.insert('splitGroupActivity', {
      groupId: args.groupId,
      kind: 'expense_added',
      at: nowIso,
      actorMemberId: actorId,
      expenseId: id as string,
      title: args.title.trim(),
      subtitle: `${recorderName} added · Paid by ${payerName} · ${splitMethodConvexLabel(args.splitMethod)}`,
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
      receiptUri:
        args.receiptUri !== undefined
          ? args.receiptUri.trim() || undefined
          : existing.receiptUri,
      expenseDate: args.expenseDate ?? existing.expenseDate,
      updatedAt: nowIso,
      version: existing.version + 1,
    });

    const editorName = convexMemberSettledName(members, actorId);
    const expenseTitleNext = args.title?.trim() ?? existing.title;

    await ctx.db.insert('splitGroupActivity', {
      groupId: existing.groupId,
      kind: 'expense_edited',
      at: nowIso,
      actorMemberId: actorId,
      expenseId: args.expenseId as string,
      title: expenseTitleNext,
      subtitle: `${editorName} updated this expense`,
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

    const memberRowsDel = await loadMembers(ctx, existing.groupId);
    const deleterName = convexMemberSettledName(memberRowsDel, actorId);

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
      subtitle: `${deleterName} deleted this expense`,
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

    const groupHead = await ctx.db.get(args.groupId);
    if (!groupHead) throw new ConvexError('Group not found.');
    const groupCurrency = normalizedGroupCurrency(groupHead.currency);

    const nowIso = isoFromMs(Date.now());
    const actorId = await viewerMemberId(ctx, args.groupId, userId);

    const rosterSt = await loadMembers(ctx, args.groupId);
    const fromNm = convexMemberSettledName(rosterSt, args.fromMemberId);
    const toNm = convexMemberSettledName(rosterSt, args.toMemberId);
    const markerNm = convexMemberSettledName(rosterSt, actorId);
    const noteTrim = args.note?.trim();

    const settlementSubtitle = (() => {
      const partial = amountMinor < cap && cap > 0;
      if (partial) {
        let s = `Partial payment: ${formatMinorAudit(amountMinor, groupCurrency)} of ${formatMinorAudit(cap, groupCurrency)} still owed · Recorded by ${markerNm}`;
        if (noteTrim) s += ` · ${noteTrim}`;
        return s;
      }
      return noteTrim ? `Recorded by ${markerNm} · ${noteTrim}` : `Recorded by ${markerNm}`;
    })();

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
      title: `${fromNm} paid ${toNm}`,
      subtitle: settlementSubtitle,
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

    const rosterVoid = await loadMembers(ctx, args.groupId);
    const voidActor = convexMemberSettledName(rosterVoid, actorId);
    const voidOther = convexMemberSettledName(rosterVoid, args.otherMemberId);

    for (const s of removed) {
      await ctx.db.delete(s._id);
    }

    await ctx.db.insert('splitGroupActivity', {
      groupId: args.groupId,
      kind: 'settlements_voided',
      at: nowIso,
      actorMemberId: actorId,
      targetMemberId: args.otherMemberId,
      title: `${voidActor} voided settlements with ${voidOther}`,
      subtitle:
        removed.length === 1
          ? 'One recorded payment was removed.'
          : `${removed.length} recorded payments were removed.`,
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

      const fromLabel = convexMemberSettledName(memberRows, fromMemberId);
      const toLabel = convexMemberSettledName(memberRows, toMemberId);
      const recorderLabel = convexMemberSettledName(memberRows, actorId);
      const cur = splitGroup.currency;
      const isPartialBulk = amountMinor < capMinor && capMinor > 0;
      const bulkSubtitle = isPartialBulk
        ? `Partial payment: ${formatMinorAudit(amountMinor, cur)} of ${formatMinorAudit(capMinor, cur)} still owed · Recorded by ${recorderLabel} · Settle all`
        : `Recorded by ${recorderLabel} · Settle all`;

      await ctx.db.insert('splitGroupActivity', {
        groupId: args.groupId,
        kind: 'settlement_recorded',
        at: nowIso,
        actorMemberId: actorId,
        settlementId: sid as string,
        title: `${fromLabel} paid ${toLabel}`,
        subtitle: bulkSubtitle,
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
