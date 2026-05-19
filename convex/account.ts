import { getAuthUserId } from '@convex-dev/auth/server';
import { ConvexError, v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { mutation, query, type MutationCtx } from './_generated/server';

/** Public signup helper: true when no user row claims this username (indexed). */
export const isUsernameAvailable = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const slug = args.username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(slug)) {
      return { available: false as const };
    }
    const existing = await ctx.db
      .query('users')
      .withIndex('username', (q) => q.eq('username', slug))
      .first();
    return { available: existing === null };
  },
});

function assertDevAccountDeletionEnabled(): void {
  if (process.env.DEBTLY_ALLOW_ACCOUNT_DELETE !== 'true') {
    throw new ConvexError('Account deletion is disabled on this deployment.');
  }
}

async function deleteRefreshTokensForSession(
  ctx: MutationCtx,
  sessionId: Id<'authSessions'>
): Promise<void> {
  const refreshTokens = await ctx.db
    .query('authRefreshTokens')
    .withIndex('sessionId', (q) => q.eq('sessionId', sessionId))
    .collect();
  for (const token of refreshTokens) {
    await ctx.db.delete(token._id);
  }
}

async function deleteSessionAndRelated(ctx: MutationCtx, sessionId: Id<'authSessions'>) {
  const verifiers = await ctx.db
    .query('authVerifiers')
    .filter((q) => q.eq(q.field('sessionId'), sessionId))
    .collect();
  for (const verifier of verifiers) {
    await ctx.db.delete(verifier._id);
  }
  await deleteRefreshTokensForSession(ctx, sessionId);
  await ctx.db.delete(sessionId);
}

async function deleteAuthRecordsForUser(ctx: MutationCtx, userId: Id<'users'>) {
  const user = await ctx.db.get(userId);
  if (!user) {
    return;
  }

  const sessions = await ctx.db
    .query('authSessions')
    .withIndex('userId', (q) => q.eq('userId', userId))
    .collect();
  for (const session of sessions) {
    await deleteSessionAndRelated(ctx, session._id);
  }

  const accounts = await ctx.db
    .query('authAccounts')
    .withIndex('userIdAndProvider', (q) => q.eq('userId', userId))
    .collect();
  for (const account of accounts) {
    const codes = await ctx.db
      .query('authVerificationCodes')
      .withIndex('accountId', (q) => q.eq('accountId', account._id))
      .collect();
    for (const code of codes) {
      await ctx.db.delete(code._id);
    }
    await ctx.db.delete(account._id);
  }

  if (user.email) {
    const rateLimits = await ctx.db
      .query('authRateLimits')
      .withIndex('identifier', (q) => q.eq('identifier', user.email!))
      .collect();
    for (const limit of rateLimits) {
      await ctx.db.delete(limit._id);
    }
  }

  await ctx.db.delete(userId);
}

/** Dev-only: permanently removes the signed-in Convex Auth user and linked auth rows. */
export const deleteMyAccount = mutation({
  args: {},
  handler: async (ctx) => {
    assertDevAccountDeletionEnabled();

    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError('Not authenticated.');
    }

    await deleteAuthRecordsForUser(ctx, userId);
  },
});
