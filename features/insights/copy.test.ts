import { describe, expect, it } from 'vitest';
import { entriesThisYearHeroLabel, entriesThisYearWord } from '@/features/insights/copy';

describe('entriesThisYearWord', () => {
  it('uses singular for one entry', () => {
    expect(entriesThisYearWord(1)).toBe('Entry');
  });

  it('uses plural for zero or multiple entries', () => {
    expect(entriesThisYearWord(0)).toBe('Entries');
    expect(entriesThisYearWord(2)).toBe('Entries');
  });
});

describe('entriesThisYearHeroLabel', () => {
  it('formats the two-line hero label', () => {
    expect(entriesThisYearHeroLabel(1)).toBe('Entry\nThis year');
    expect(entriesThisYearHeroLabel(3)).toBe('Entries\nThis year');
  });
});
