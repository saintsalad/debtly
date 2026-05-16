import { describe, expect, it } from 'vitest';

import { isMajorWithinInputCap } from '@/features/debts/money';

describe('isMajorWithinInputCap', () => {
  it('rejects extreme magnitudes whose scaled cents overflow', () => {
    expect(isMajorWithinInputCap(Number.MAX_VALUE)).toBe(false);
    expect(isMajorWithinInputCap(1e306)).toBe(false);
  });

  it('accepts amounts at or below ceiling', () => {
    expect(isMajorWithinInputCap(999_999.99)).toBe(true);
    expect(isMajorWithinInputCap(-999_999.99)).toBe(true);
  });
});
