const MINOR_UNIT_FACTOR = 100;

export const MAX_INTEREST_RATE_BPS = 10_000;

/** Major amount caps for typed currency fields (prevents unrealistic / overflow-heavy values). */
export const MAX_INPUT_AMOUNT_MAJOR = 999_999.99;

/** Rounded minor-units ceiling for {@link MAX_INPUT_AMOUNT_MAJOR} (999,999.99 → 99,999,999). */
export const MAX_INPUT_AMOUNT_MINOR = 99_999_999;

const INPUT_MAX_FRACTION_DIGITS = 2;

function sanitizeUnsignedMajorDigits(rawUnsigned: string, maxMajor: number): string {
  const maxIntDigits = String(Math.floor(maxMajor)).length;
  const cleaned = rawUnsigned.replace(/[^\d.]/g, '');
  if (!cleaned) return '';

  const sep = cleaned.indexOf('.');
  const rawInt = sep === -1 ? cleaned : cleaned.slice(0, sep);
  const rawFrac = sep === -1 ? '' : cleaned.slice(sep + 1);
  const fracDigits = rawFrac.replace(/\./g, '').slice(0, INPUT_MAX_FRACTION_DIGITS);
  const trailingDot = sep !== -1 && rawFrac.replace(/\./g, '') === '';

  const intPart = rawInt.slice(0, maxIntDigits);

  if (!(intPart || fracDigits || trailingDot)) {
    return '';
  }

  let display: string;
  if (trailingDot) {
    display = `${intPart || '0'}.`;
  } else if (fracDigits) {
    display = `${intPart || '0'}.${fracDigits}`;
  } else {
    display = intPart || '';
    if (!display) return '';
  }

  if (!trailingDot) {
    const n = Number.parseFloat(display);
    if (Number.isFinite(n) && n > maxMajor) {
      return maxMajor.toFixed(INPUT_MAX_FRACTION_DIGITS);
    }
    return display;
  }

  const pint = Number.parseFloat(intPart || '0');
  if (Number.isFinite(pint) && pint > Math.floor(maxMajor)) {
    return `${Math.floor(maxMajor)}.`;
  }

  return display;
}

/** Percents typed as plain numbers where 100 = full bill (≤ 100%). */
export const MAX_PERCENT_MAJOR = 100;

/**
 * Normalize positive amount typing: digits / one decimal point, ≤2 fraction digits, capped at MAX_INPUT_AMOUNT_MAJOR.
 */
export function sanitizeExpenseMajorInput(raw: string): string {
  return sanitizeUnsignedMajorDigits(raw.replace(/,/g, '').trim(), MAX_INPUT_AMOUNT_MAJOR);
}

/** Normalize percent field (0–100, two fractional digits max). */
export function sanitizePercentMajorInput(raw: string): string {
  return sanitizeUnsignedMajorDigits(raw.replace(/,/g, '').trim(), MAX_PERCENT_MAJOR);
}

/** Same constraints as expense amounts, optional leading − (for adjustments, etc.). */
export function sanitizeSignedMajorInput(raw: string): string {
  const trimmed = raw.replace(/,/g, '').trim();
  const neg = trimmed.startsWith('-');
  const body = sanitizeUnsignedMajorDigits(trimmed.slice(1), MAX_INPUT_AMOUNT_MAJOR);
  if (body === '') {
    return neg ? '-' : '';
  }
  return neg ? `-${body}` : body;
}

/** User-facing error when total exceeds {@link MAX_INPUT_AMOUNT_MAJOR}. */
export const AMOUNT_EXCEEDS_MAX_MESSAGE = `Amount is too large. The maximum is ${MAX_INPUT_AMOUNT_MAJOR.toFixed(2)}.`;

/** Whether the value fits the input ceiling when converted to minor units (handles signed deltas). */
export function isMajorWithinInputCap(major: number): boolean {
  if (!Number.isFinite(major)) return false;
  const scaled = major * MINOR_UNIT_FACTOR;
  if (!Number.isFinite(scaled)) return false;
  const minor = Math.round(scaled);
  if (!Number.isFinite(minor)) return false;
  return minor >= -MAX_INPUT_AMOUNT_MINOR && minor <= MAX_INPUT_AMOUNT_MINOR;
}

export function majorToMinor(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  const scaled = amount * MINOR_UNIT_FACTOR;
  if (!Number.isFinite(scaled)) return 0;
  return Math.round(scaled);
}

export function minorToMajor(amountMinor: number): number {
  return amountMinor / MINOR_UNIT_FACTOR;
}

export function allocatePaymentMinor(
  paymentMinor: number,
  interestOutstandingMinor: number,
  principalOutstandingMinor: number
): {
  interestAppliedMinor: number;
  principalAppliedMinor: number;
  remainingMinor: number;
} {
  const safePayment = Math.max(0, paymentMinor);
  const interestAppliedMinor = Math.min(safePayment, Math.max(0, interestOutstandingMinor));
  const principalAppliedMinor = Math.min(
    safePayment - interestAppliedMinor,
    Math.max(0, principalOutstandingMinor)
  );

  return {
    interestAppliedMinor,
    principalAppliedMinor,
    remainingMinor: safePayment - interestAppliedMinor - principalAppliedMinor,
  };
}

export function sumPaymentMinor(payments: { amountMinor: number }[]): number {
  return payments.reduce((sum, payment) => sum + payment.amountMinor, 0);
}
