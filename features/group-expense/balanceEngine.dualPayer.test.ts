import { describe, expect, it } from 'vitest';

import { netBetween, selectGroupBalances, buildGroupEdges } from './balanceEngine';
import type { GroupExpense, SplitGroup } from './types';

const joinedAt = '2026-01-01T00:00:00.000Z';

const caleId = 'cale';
const adaId = 'ada';
const boId = 'bo';
const diaId = 'dia';

/** \$72 + \$48 trip, two payers — equal split among four */
function dualPayerTripGroup(): SplitGroup {
  return {
    id: 'g-trip',
    name: 'Trip',
    inviteCode: 'TRIP42',
    members: [
      { id: caleId, displayName: 'Cale', isCurrentUser: true, joinedAt },
      { id: adaId, displayName: 'Ada', isCurrentUser: false, joinedAt },
      { id: boId, displayName: 'Bo', isCurrentUser: false, joinedAt },
      { id: diaId, displayName: 'Dia', isCurrentUser: false, joinedAt },
    ],
    createdAt: joinedAt,
    updatedAt: joinedAt,
    version: 1,
  };
}

function equalExpense(
  opts: Pick<GroupExpense, 'id' | 'amountMinor' | 'paidByMemberId' | 'includedMemberIds'>
): GroupExpense {
  const { id, amountMinor, paidByMemberId, includedMemberIds } = opts;
  return {
    id,
    groupId: 'g-trip',
    title: id,
    amountMinor,
    currency: 'USD',
    expenseDate: '2026-01-15',
    createdAt: joinedAt,
    updatedAt: joinedAt,
    version: 1,
    paidByMemberId,
    splitMethod: 'equal',
    includedMemberIds,
    shares: includedMemberIds.map((memberId) => ({ memberId })),
  };
}

describe('dual payer · two equal-split expenses vs current user', () => {
  it('nets Ada→Cale \$6 and total owed to Cale \$42 on \$72 + \$48 (four-way equal)', () => {
    const group = dualPayerTripGroup();
    const included = [caleId, adaId, boId, diaId];
    const expenses: GroupExpense[] = [
      equalExpense({
        id: 'hotel',
        amountMinor: 7200,
        paidByMemberId: caleId,
        includedMemberIds: included,
      }),
      equalExpense({
        id: 'tickets',
        amountMinor: 4800,
        paidByMemberId: adaId,
        includedMemberIds: included,
      }),
    ];

    const edges = buildGroupEdges(expenses, [], group.id);

    // Pairwise nets from Cale's perspective: positive ⇒ they owe Cale.
    expect(netBetween(edges, caleId, adaId)).toBe(600);
    expect(netBetween(edges, caleId, boId)).toBe(1800);
    expect(netBetween(edges, caleId, diaId)).toBe(1800);

    const summary = selectGroupBalances(group, expenses, []);
    expect(summary.youOweMinor).toBe(0);
    expect(summary.youAreOwedMinor).toBe(4200);
    expect(summary.isSettled).toBe(false);

    const adaPair = summary.pairwise.find((p) => p.memberId === adaId);
    const boPair = summary.pairwise.find((p) => p.memberId === boId);
    expect(adaPair?.netMinor).toBe(600);
    expect(boPair?.netMinor).toBe(1800);
  });
});
