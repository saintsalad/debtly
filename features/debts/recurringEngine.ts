import { Debt } from '@/features/debts/types';
import { advanceRecurringDueDate, toLocalDateString } from '@/features/debts/dates';
import { buildInterestFields } from '@/features/debts/interestEngine';
import { generateId } from '@/lib/utils';

export function buildNextRecurringCycle(
  settledDebt: Debt,
  generatedAt: string
): Debt | null {
  if (!settledDebt.isRecurring || !settledDebt.recurrenceInterval) return null;
  if (!settledDebt.recurrenceAnchorDate || !settledDebt.dueDate) return null;
  if (settledDebt.status !== 'paid') return null;

  const nextDueDate = advanceRecurringDueDate(
    settledDebt.recurrenceAnchorDate,
    settledDebt.dueDate,
    settledDebt.recurrenceInterval
  );

  const interestFields = buildInterestFields(
    {
      personName: settledDebt.personName,
      amount: settledDebt.principalMinor / 100,
      type: settledDebt.type,
      note: settledDebt.note,
      dueDate: nextDueDate,
      interestRateBps: settledDebt.interestRateBps,
      interestStartMode: settledDebt.interestStartMode,
      interestAccrualFrequency: settledDebt.interestAccrualFrequency,
      isRecurring: true,
      recurrenceInterval: settledDebt.recurrenceInterval,
    },
    generatedAt
  );

  return {
    id: generateId(),
    personName: settledDebt.personName,
    principalMinor: settledDebt.principalMinor,
    type: settledDebt.type,
    note: settledDebt.note,
    dueDate: nextDueDate,
    status: 'pending',
    payments: [],
    createdAt: generatedAt,
    updatedAt: generatedAt,
    ...interestFields,
    isRecurring: true,
    recurrenceInterval: settledDebt.recurrenceInterval,
    recurrenceAnchorDate: settledDebt.recurrenceAnchorDate,
    nextCycleDate: nextDueDate,
    lastGeneratedAt: generatedAt,
    recurringGroupId: settledDebt.recurringGroupId ?? settledDebt.id,
    recurringSourceId: settledDebt.recurringSourceId ?? settledDebt.id,
  };
}

export function hasOpenRecurringCycle(debts: Debt[], groupId?: string): boolean {
  if (!groupId) return false;
  return debts.some(
    (debt) => debt.recurringGroupId === groupId && debt.status !== 'paid'
  );
}

export function canGenerateNextRecurringCycle(debts: Debt[], settledDebt: Debt): boolean {
  if (!settledDebt.isRecurring || !settledDebt.recurrenceInterval) return false;
  if (!settledDebt.recurringGroupId) return true;
  return !hasOpenRecurringCycle(
    debts.filter((debt) => debt.id !== settledDebt.id),
    settledDebt.recurringGroupId
  );
}

export function stampRecurringGeneration(debt: Debt, generatedAt: string): Debt {
  return {
    ...debt,
    lastGeneratedAt: generatedAt,
    nextCycleDate: debt.dueDate ? toLocalDateString(debt.dueDate) : debt.nextCycleDate,
    updatedAt: generatedAt,
  };
}
