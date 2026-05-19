/** Minor-unit helpers duplicated for Convex bundle (no `@/` imports). */
export const MAX_INPUT_AMOUNT_MAJOR = 999_999.99;
export const MAX_INPUT_AMOUNT_MINOR = 99_999_999;
export const AMOUNT_EXCEEDS_MAX_MESSAGE = `Amount is too large. The maximum is ${MAX_INPUT_AMOUNT_MAJOR.toFixed(2)}.`;

const MINOR_UNIT_FACTOR = 100;

export function majorToMinor(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  const scaled = amount * MINOR_UNIT_FACTOR;
  if (!Number.isFinite(scaled)) return 0;
  return Math.round(scaled);
}
