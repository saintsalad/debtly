import { getAuthUserId } from '@convex-dev/auth/server';
import { ConvexError, v } from 'convex/values';

import { mutation, query } from './_generated/server';

/** Current authenticated user row (for syncing profile photo / display fields). */
export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    return await ctx.db.get(userId);
  },
});

export const generateAvatarUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError('Not authenticated.');
    }
    return await ctx.storage.generateUploadUrl();
  },
});

export const finalizeProfileAvatar = mutation({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, { storageId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError('Not authenticated.');
    }

    const url = await ctx.storage.getUrl(storageId);
    if (!url) {
      throw new ConvexError('Could not resolve uploaded file.');
    }

    await ctx.db.patch(userId, { image: url });
    return url;
  },
});
