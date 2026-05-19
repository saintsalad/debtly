import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-linking', () => ({
  parse() {
    return { path: '', hostname: '', queryParams: {} };
  },
}));

import { joinSplitGroupFromInvite } from '@/features/group-expense/joinSplitGroupFlow';

describe('joinSplitGroupFromInvite', () => {
  it('uses Convex when preferred and falls back to local on Convex failure', async () => {
    const convexJoin = vi.fn().mockRejectedValue(new Error('bad'));
    const localJoin = vi.fn().mockReturnValue('local-id');

    await expect(
      joinSplitGroupFromInvite({
        rawCodeOrLink: 'ABC',
        displayName: 'Pat',
        preferConvex: true,
        convexJoin,
        localJoin,
      })
    ).resolves.toEqual({ groupId: 'local-id' });

    expect(convexJoin).toHaveBeenCalledWith('ABC');
    expect(localJoin).toHaveBeenCalledWith('ABC', 'Pat');
  });

  it('returns Convex group id without hitting local join when Convex succeeds', async () => {
    const convexJoin = vi.fn().mockResolvedValue({ groupId: 'cloud' });
    const localJoin = vi.fn();

    await expect(
      joinSplitGroupFromInvite({
        rawCodeOrLink: 'ZZ',
        displayName: 'Pat',
        preferConvex: true,
        convexJoin,
        localJoin,
      })
    ).resolves.toEqual({ groupId: 'cloud' });

    expect(localJoin).not.toHaveBeenCalled();
  });

  it('returns null when nothing matches', async () => {
    await expect(
      joinSplitGroupFromInvite({
        rawCodeOrLink: '   ',
        displayName: 'Pat',
        preferConvex: false,
        localJoin: () => null,
      })
    ).resolves.toBeNull();
  });
});
