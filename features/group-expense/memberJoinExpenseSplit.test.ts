import { describe, expect, it } from 'vitest';

import { buildGroupEdges, netBetween, selectGroupBalances } from '@/features/group-expense/balanceEngine';
import { reconcileExpenseSplitsWhenMemberJoins } from '@/features/group-expense/memberJoinExpenseSplit';
import type { GroupExpense, SplitGroup } from '@/features/group-expense/types';

const joinedAt = '2026-03-01T00:00:00.000Z';
const gid = 'g1';

describe('memberJoinExpenseSplit', () => {
  it('adds newcomer to splits that matched the full roster before join (solo → pair)', () => {
    const cale = { id: 'cale', displayName: 'Cale', isCurrentUser: true as const, joinedAt };
    const rosterBeforeAda = [cale];

    const soloExpense: GroupExpense = {
      id: 'e1',
      groupId: gid,
      title: 'Meal',
      amountMinor: 10_000,
      currency: 'USD',
      paidByMemberId: cale.id,
      splitMethod: 'equal',
      includedMemberIds: [cale.id],
      shares: [{ memberId: cale.id }],
      expenseDate: '2026-03-02',
      createdAt: joinedAt,
      updatedAt: joinedAt,
      version: 1,
    };

    const adaId = 'ada';
    const now = '2026-03-03T12:00:00.000Z';
    const [patched] = reconcileExpenseSplitsWhenMemberJoins({
      expenses: [soloExpense],
      groupId: gid,
      rosterBeforeIncoming: rosterBeforeAda,
      incomingMemberId: adaId,
      nowIso: now,
    });

    expect(patched.includedMemberIds).toEqual(['cale', 'ada']);
    expect(patched.updatedAt).toBe(now);
    expect(patched.version).toBe(2);

    const ada = { id: adaId, displayName: 'Ada', isCurrentUser: false as const, joinedAt: now };

    const group: SplitGroup = {
      id: gid,
      name: 'Hang',
      inviteCode: 'X',
      members: [cale, ada],
      createdAt: joinedAt,
      updatedAt: now,
      version: 1,
    };

    const edges = buildGroupEdges([patched], [], gid);
    /* Ada owes Cale $50 on $100 total at 50–50 equal */
    expect(netBetween(edges, cale.id, adaId)).toBe(5000);

    const summary = selectGroupBalances(group, [patched], []);
    const adaPair = summary.pairwise.find((p) => p.memberId === adaId);
    expect(adaPair?.netMinor).toBe(5000);
    expect(summary.youAreOwedMinor).toBe(5000);
  });

  it('does not expand when expense did not include everyone already in the group', () => {
    const alpha = {
      id: 'alpha',
      displayName: 'Alpha',
      isCurrentUser: false as const,
      joinedAt,
    };
    const beta = {
      id: 'beta',
      displayName: 'Beta',
      isCurrentUser: true as const,
      joinedAt,
    };
    const gamma = {
      id: 'gamma',
      displayName: 'Gamma',
      isCurrentUser: false as const,
      joinedAt,
    };
    /** Three members; Alpha and Gamma split lunch without Beta (deliberately). */
    const rosterBeforeDelta = [alpha, beta, gamma];

    const pairOnlyAmongThree: GroupExpense = {
      id: 'e2',
      groupId: gid,
      title: 'Lunch',
      amountMinor: 9000,
      currency: 'USD',
      paidByMemberId: alpha.id,
      splitMethod: 'equal',
      includedMemberIds: [alpha.id, gamma.id],
      shares: [{ memberId: alpha.id }, { memberId: gamma.id }],
      expenseDate: '2026-03-02',
      createdAt: joinedAt,
      updatedAt: joinedAt,
      version: 1,
    };

    const deltaId = 'delta';
    const now = '2026-03-05T00:00:00.000Z';
    const [patched] = reconcileExpenseSplitsWhenMemberJoins({
      expenses: [pairOnlyAmongThree],
      groupId: gid,
      rosterBeforeIncoming: rosterBeforeDelta,
      incomingMemberId: deltaId,
      nowIso: now,
    });

    expect(patched.includedMemberIds).toEqual([alpha.id, gamma.id]);
    expect(patched.version).toBe(1);
  });
});
