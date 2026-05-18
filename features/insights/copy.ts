/** Pluralized "entry/entries this year" for insights widgets. */

export function entriesThisYearWord(count: number): string {
  return count === 1 ? 'Entry' : 'Entries';
}

/** Two-line hero label on the full insights screen (e.g. "Entry\nThis year"). */
export function entriesThisYearHeroLabel(count: number): string {
  return `${entriesThisYearWord(count)}\nThis year`;
}
