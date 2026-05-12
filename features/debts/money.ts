const MINOR_UNIT_FACTOR = 100;

export const MAX_INTEREST_RATE_BPS = 10_000;

export function majorToMinor(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * MINOR_UNIT_FACTOR);
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

export function sumPaymentMinor(payments: Array<{ amountMinor: number }>): number {
  return payments.reduce((sum, payment) => sum + payment.amountMinor, 0);
}
