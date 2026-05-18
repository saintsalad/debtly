import { describe, expect, it } from 'vitest';
import type { Debt } from '@/features/debts/types';
import { assembleDebts, debtToRow, paymentToRow, rowToDebt } from '@/lib/db/mappers/debt';

const sampleDebt: Debt = {
  id: 'd1',
  personName: 'Alex',
  principalMinor: 50000,
  type: 'owed_to_me',
  status: 'pending',
  payments: [
    {
      id: 'p1',
      amountMinor: 10000,
      interestAppliedMinor: 0,
      principalAppliedMinor: 10000,
      paidAt: '2025-01-01T00:00:00.000Z',
      note: 'partial',
    },
  ],
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-02T00:00:00.000Z',
  conversionRate: 56.5,
};

describe('debt mapper', () => {
  it('round-trips debt and payments', () => {
    const row = debtToRow(sampleDebt);
    const paymentRow = paymentToRow(sampleDebt.payments![0], sampleDebt.id);
    const restored = assembleDebts([row], [paymentRow])[0];

    expect(restored.id).toBe(sampleDebt.id);
    expect(restored.personName).toBe(sampleDebt.personName);
    expect(restored.principalMinor).toBe(sampleDebt.principalMinor);
    expect(restored.conversionRate).toBe(56.5);
    expect(restored.payments).toHaveLength(1);
    expect(restored.payments![0].note).toBe('partial');
  });

  it('handles debts without payments', () => {
    const { payments: _p, ...noPayments } = sampleDebt;
    const row = debtToRow(noPayments);
    const restored = rowToDebt(row, []);
    expect(restored.payments).toBeUndefined();
  });
});
