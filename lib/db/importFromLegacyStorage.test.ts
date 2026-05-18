import { describe, expect, it } from 'vitest';
import { parseLegacyStoragePayloads } from '@/lib/db/parseLegacyStorage';

describe('parseLegacyStoragePayloads', () => {
  it('parses zustand persist envelopes and migrates debts', () => {
    const debtsRaw = JSON.stringify({
      state: {
        debts: [
          {
            id: 'd1',
            personName: 'Pat',
            amount: 100,
            type: 'owed_to_me',
            status: 'pending',
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z',
          },
        ],
      },
      version: 2,
    });

    const payload = parseLegacyStoragePayloads({ debts: debtsRaw }, 'You');

    expect(payload.debts).toHaveLength(1);
    expect(payload.debts[0].principalMinor).toBe(10000);
    expect(payload.debts[0].personName).toBe('Pat');
  });

  it('migrates legacy bill splits into group state when groups key is empty', () => {
    const billSplitsRaw = JSON.stringify({
      state: {
        splits: [
          {
            id: 'bs1',
            title: 'Lunch',
            total: 200,
            participants: [
              { id: 'p1', name: 'Sam', amount: 100, paid: false },
            ],
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z',
          },
        ],
      },
      version: 0,
    });

    const payload = parseLegacyStoragePayloads(
      { billSplits: billSplitsRaw, groups: null },
      'You'
    );

    expect(payload.groupState.groups.length).toBeGreaterThan(0);
    expect(payload.groupState.expenses.length).toBeGreaterThan(0);
    expect(payload.billSplits).toHaveLength(1);
  });
});
