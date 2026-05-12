import { Debt, DebtPayment } from '@/features/debts/types';
import {
  countAccrualPeriods,
  isOnOrBefore,
  parseLocalDate,
  toLocalDateString,
} from '@/features/debts/dates';
import {
  allocatePaymentMinor,
  majorToMinor,
  minorToMajor,
  sumPaymentMinor,
} from '@/features/debts/money';
import { isBefore } from 'date-fns';
import {
  DEFAULT_INTEREST_ACCRUAL_FREQUENCY,
  resolveInterestStartDate,
} from '@/features/debts/interestEngine';

export interface DebtLedgerSnapshot {
  accruedInterestMinor: number;
  interestPaidMinor: number;
  principalPaidMinor: number;
  totalPaidMinor: number;
  totalDueMinor: number;
  remainingMinor: number;
  isSettled: boolean;
}

function sortPayments(payments: DebtPayment[]): DebtPayment[] {
  return [...payments].sort(
    (a, b) => new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime()
  );
}

function accrueInterestForPeriods(
  principalRemainingMinor: number,
  rateBps: number,
  periods: number,
  frequency: 'monthly' | 'yearly'
): number {
  if (principalRemainingMinor <= 0 || periods <= 0 || rateBps <= 0) return 0;

  const annualRate = rateBps / 10_000;
  const periodRate = frequency === 'monthly' ? annualRate / 12 : annualRate;
  return Math.round(principalRemainingMinor * periodRate * periods);
}

function accrueBetweenDates(
  principalRemainingMinor: number,
  rateBps: number,
  frequency: 'monthly' | 'yearly',
  fromDate: string,
  toDate: string
): number {
  const periods = countAccrualPeriods(fromDate, toDate, frequency);
  return accrueInterestForPeriods(principalRemainingMinor, rateBps, periods, frequency);
}

function applyPaymentWaterfall(
  paymentMinor: number,
  interestOutstandingMinor: number,
  principalRemainingMinor: number
) {
  return allocatePaymentMinor(paymentMinor, interestOutstandingMinor, principalRemainingMinor);
}

export function projectDebtLedger(debt: Debt, asOf = new Date()): DebtLedgerSnapshot {
  if (debt.status === 'paid' && debt.paidAt) {
    const accruedInterestMinor = debt.accruedInterestMinor ?? 0;
    const interestPaidMinor = debt.interestPaidMinor ?? 0;
    const principalPaidMinor = debt.principalPaidMinor ?? 0;
    const totalPaidMinor = sumPaymentMinor(debt.payments ?? []);
    const totalDueMinor = debt.principalMinor + accruedInterestMinor;

    return {
      accruedInterestMinor,
      interestPaidMinor,
      principalPaidMinor,
      totalPaidMinor,
      totalDueMinor,
      remainingMinor: 0,
      isSettled: true,
    };
  }

  const payments = sortPayments(debt.payments ?? []);
  const interestStartDate = resolveInterestStartDate(debt);
  const frequency = debt.interestAccrualFrequency ?? DEFAULT_INTEREST_ACCRUAL_FREQUENCY;
  const asOfDate = toLocalDateString(asOf);

  let principalRemainingMinor = debt.principalMinor;
  let interestOutstandingMinor = 0;
  let interestPaidMinor = 0;
  let principalPaidMinor = 0;
  let accrualCursor = interestStartDate ?? asOfDate;

  if (debt.interestRateBps && interestStartDate) {
    for (const payment of payments) {
      const paymentDate = toLocalDateString(payment.paidAt);

      if (isBefore(parseLocalDate(paymentDate), parseLocalDate(interestStartDate))) {
        const allocation = applyPaymentWaterfall(
          payment.amountMinor,
          0,
          principalRemainingMinor
        );
        interestPaidMinor += allocation.interestAppliedMinor;
        principalPaidMinor += allocation.principalAppliedMinor;
        principalRemainingMinor -= allocation.principalAppliedMinor;
        continue;
      }

      if (isOnOrBefore(new Date(payment.paidAt), parseLocalDate(accrualCursor))) {
        const allocation = applyPaymentWaterfall(
          payment.amountMinor,
          interestOutstandingMinor,
          principalRemainingMinor
        );
        interestPaidMinor += allocation.interestAppliedMinor;
        principalPaidMinor += allocation.principalAppliedMinor;
        principalRemainingMinor -= allocation.principalAppliedMinor;
        interestOutstandingMinor -= allocation.interestAppliedMinor;
        continue;
      }

      interestOutstandingMinor += accrueBetweenDates(
        principalRemainingMinor,
        debt.interestRateBps,
        frequency,
        accrualCursor,
        paymentDate
      );
      accrualCursor = paymentDate;

      const allocation = applyPaymentWaterfall(
        payment.amountMinor,
        interestOutstandingMinor,
        principalRemainingMinor
      );
      interestPaidMinor += allocation.interestAppliedMinor;
      principalPaidMinor += allocation.principalAppliedMinor;
      principalRemainingMinor -= allocation.principalAppliedMinor;
      interestOutstandingMinor -= allocation.interestAppliedMinor;
    }

    if (principalRemainingMinor > 0 || interestOutstandingMinor > 0) {
      interestOutstandingMinor += accrueBetweenDates(
        principalRemainingMinor,
        debt.interestRateBps,
        frequency,
        accrualCursor,
        asOfDate
      );
    }
  } else {
    for (const payment of payments) {
      const allocation = applyPaymentWaterfall(
        payment.amountMinor,
        interestOutstandingMinor,
        principalRemainingMinor
      );
      interestPaidMinor += allocation.interestAppliedMinor;
      principalPaidMinor += allocation.principalAppliedMinor;
      principalRemainingMinor -= allocation.principalAppliedMinor;
    }
  }

  const accruedInterestMinor = interestOutstandingMinor + interestPaidMinor;
  const totalPaidMinor = sumPaymentMinor(payments);
  const totalDueMinor = debt.principalMinor + accruedInterestMinor;
  const remainingMinor = Math.max(0, totalDueMinor - totalPaidMinor);

  return {
    accruedInterestMinor,
    interestPaidMinor,
    principalPaidMinor,
    totalPaidMinor,
    totalDueMinor,
    remainingMinor,
    isSettled: remainingMinor <= 0,
  };
}

export function createPaymentRecord(
  debt: Debt,
  amountMajor: number,
  paidAt: string,
  note?: string
): DebtPayment {
  const snapshot = projectDebtLedger(debt, new Date(paidAt));
  const allocation = applyPaymentWaterfall(
    majorToMinor(amountMajor),
    snapshot.accruedInterestMinor - snapshot.interestPaidMinor,
    debt.principalMinor - snapshot.principalPaidMinor
  );

  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
    amountMinor: majorToMinor(amountMajor),
    interestAppliedMinor: allocation.interestAppliedMinor,
    principalAppliedMinor: allocation.principalAppliedMinor,
    paidAt,
    note,
  };
}

export function settleDebtLedger(debt: Debt, settledAt: string): Debt {
  const snapshot = projectDebtLedger(debt, new Date(settledAt));

  return {
    ...debt,
    status: 'paid',
    paidAt: settledAt,
    accruedInterestMinor: snapshot.accruedInterestMinor,
    interestPaidMinor: snapshot.interestPaidMinor,
    principalPaidMinor: snapshot.principalPaidMinor,
    updatedAt: settledAt,
  };
}

export function syncDebtLedger(debt: Debt, asOf = new Date()): Debt {
  const snapshot = projectDebtLedger(debt, asOf);

  if (snapshot.isSettled && debt.status !== 'paid') {
    return settleDebtLedger(debt, asOf.toISOString());
  }

  return {
    ...debt,
    interestPaidMinor: snapshot.interestPaidMinor,
    principalPaidMinor: snapshot.principalPaidMinor,
    updatedAt: asOf.toISOString(),
  };
}

export function getRemainingBalanceMajor(debt: Debt, asOf = new Date()): number {
  return minorToMajor(projectDebtLedger(debt, asOf).remainingMinor);
}

export function getAccruedInterestMajor(debt: Debt, asOf = new Date()): number {
  return minorToMajor(projectDebtLedger(debt, asOf).accruedInterestMinor);
}

export function getTotalPaidMajor(debt: Debt, asOf = new Date()): number {
  return minorToMajor(projectDebtLedger(debt, asOf).totalPaidMinor);
}

export function getTotalDueMajor(debt: Debt, asOf = new Date()): number {
  return minorToMajor(projectDebtLedger(debt, asOf).totalDueMinor);
}

export function getPaymentProgress(debt: Debt, asOf = new Date()): number {
  const snapshot = projectDebtLedger(debt, asOf);
  if (snapshot.totalDueMinor <= 0) return 1;
  return Math.min(1, snapshot.totalPaidMinor / snapshot.totalDueMinor);
}

export function getPrincipalMajor(debt: Debt): number {
  return minorToMajor(debt.principalMinor);
}
