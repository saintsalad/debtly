import { formatReceiptFooterTagline } from '@/features/debts/receipt/receiptFooter';
import { describe, expect, it } from 'vitest';

describe('formatReceiptFooterTagline', () => {
  it('uppercases the device model in the tagline', () => {
    expect(formatReceiptFooterTagline('iPhone 15 Pro')).toBe(
      'GENERATED LOCALLY VIA IPHONE 15 PRO'
    );
  });
});
