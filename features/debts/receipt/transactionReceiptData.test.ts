import {
  buildReceiptPaymentLines,
  buildReceiptRows,
  buildTransactionReceiptData,
  formatReceiptReferenceId,
} from '@/features/debts/receipt/transactionReceiptData';
import type { Debt, DebtPayment } from '@/features/debts/types';
import { describe, expect, it } from 'vitest';

function makeDebt(overrides: Partial<Debt> = {}): Debt {
  return {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    personName: 'Victor',
    principalMinor: 95_000,
    type: 'owed_to_me',
    status: 'pending',
    payments: [],
    interestPaidMinor: 0,
    principalPaidMinor: 0,
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-01-15T00:00:00.000Z',
    ...overrides,
  };
}

const fmt = (n: number) => `₱${n.toFixed(2)}`;

describe('formatReceiptReferenceId', () => {
  it('strips dashes and groups into segments of four', () => {
    expect(formatReceiptReferenceId('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(
      'A1B2-C3D4-E5F6-7890-ABCD'
    );
  });

  it('caps at 20 characters', () => {
    const id = 'abcdefghijklmnopqrstuvwxyz';
    const result = formatReceiptReferenceId(id);
    expect(result.replace(/-/g, '').length).toBe(20);
  });
});

describe('buildReceiptRows', () => {
  it('includes core fields for a simple debt', () => {
    const rows = buildReceiptRows(makeDebt(), fmt);
    const labels = rows.map((r) => r.label);
    expect(labels).toContain('Person');
    expect(labels).toContain('Principal');
    expect(labels).toContain('Remaining');
    expect(labels).toContain('Status');
    expect(labels).not.toContain('Direction');
    expect(labels).not.toContain('Added');
    expect(labels).not.toContain('Updated');
    expect(rows.find((r) => r.label === 'Person')?.value).toBe('Victor');
  });

  it('includes interest and paid fields when applicable', () => {
    const rows = buildReceiptRows(
      makeDebt({
        interestRateBps: 1200,
        interestAccrualFrequency: 'monthly',
        accruedInterestMinor: 500,
        principalPaidMinor: 20_000,
        payments: [
          {
            id: 'p1',
            amountMinor: 20_000,
            interestAppliedMinor: 0,
            principalAppliedMinor: 20_000,
            paidAt: '2026-02-01T00:00:00.000Z',
          } satisfies DebtPayment,
        ],
      }),
      fmt
    );
    const labels = rows.map((r) => r.label);
    expect(labels).toContain('Interest rate');
    expect(labels).toContain('Interest accrual');
    expect(labels).toContain('Accrued interest');
    expect(labels).toContain('Paid to date');
  });

  it('includes paid-on for settled debts', () => {
    const rows = buildReceiptRows(
      makeDebt({
        status: 'paid',
        paidAt: '2026-03-01T12:00:00.000Z',
        principalPaidMinor: 95_000,
      }),
      fmt
    );
    expect(rows.map((r) => r.label)).toContain('Paid on');
    expect(rows.find((r) => r.label === 'Status')?.value).toBe('Paid');
  });

  it('excludes interest rows when no interest configured', () => {
    const rows = buildReceiptRows(makeDebt(), fmt);
    const labels = rows.map((r) => r.label);
    expect(labels).not.toContain('Interest rate');
    expect(labels).not.toContain('Accrued interest');
  });
});

describe('buildReceiptPaymentLines', () => {
  it('returns one row per payment', () => {
    const lines = buildReceiptPaymentLines(
      makeDebt({
        payments: [
          {
            id: 'p1',
            amountMinor: 10_000,
            interestAppliedMinor: 0,
            principalAppliedMinor: 10_000,
            paidAt: '2026-02-10T00:00:00.000Z',
          },
          {
            id: 'p2',
            amountMinor: 5_000,
            interestAppliedMinor: 0,
            principalAppliedMinor: 5_000,
            paidAt: '2026-03-10T00:00:00.000Z',
          },
        ],
      }),
      fmt
    );
    expect(lines).toHaveLength(2);
    expect(lines[0]?.value).toBe('₱50.00');
    expect(lines[1]?.value).toBe('₱100.00');
  });

  it('returns empty array when no payments', () => {
    expect(buildReceiptPaymentLines(makeDebt(), fmt)).toEqual([]);
  });
});

describe('buildTransactionReceiptData', () => {
  it('assembles reference id, timestamp, rows, and payment lines', () => {
    const printedAt = new Date('2026-05-16T09:27:53.000Z');
    const data = buildTransactionReceiptData(makeDebt(), fmt, printedAt);
    expect(data.referenceId).toBe('A1B2-C3D4-E5F6-7890-ABCD');
    expect(data.printedAt).toContain('May');
    expect(data.printedAt).toContain('2026');
    expect(data.rows.length).toBeGreaterThan(0);
    expect(data.paymentLines).toEqual([]);
  });
});
