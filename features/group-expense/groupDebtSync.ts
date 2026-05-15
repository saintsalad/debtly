import { createDebtFromInput } from '@/features/debts/debtCalculations';
import { minorToMajor } from '@/features/debts/money';
import type { Debt } from '@/features/debts/types';
import { selectGroupBalances } from '@/features/group-expense/balanceEngine';
import type {
  GroupExpense,
  Settlement,
  SplitGroup,
} from '@/features/group-expense/types';

export interface GroupDebtSyncTarget {
  memberId: string;
  displayName: string;
  netMinor: number;
  debtType: 'owed_to_me' | 'i_owe';
  principalMinor: number;
}

export function computeGroupDebtTargets(
  group: SplitGroup,
  expenses: GroupExpense[],
  settlements: Settlement[]
): GroupDebtSyncTarget[] {
  const summary = selectGroupBalances(group, expenses, settlements);
  const targets: GroupDebtSyncTarget[] = [];

  for (const pair of summary.pairwise) {
    if (pair.netMinor === 0) continue;
    targets.push({
      memberId: pair.memberId,
      displayName: pair.displayName,
      netMinor: pair.netMinor,
      debtType: pair.netMinor > 0 ? 'owed_to_me' : 'i_owe',
      principalMinor: Math.abs(pair.netMinor),
    });
  }

  return targets;
}

export function buildGroupSyncedDebt(
  group: SplitGroup,
  target: GroupDebtSyncTarget,
  existing?: Debt
): Debt {
  const now = new Date().toISOString();
  const amount = minorToMajor(target.principalMinor);

  if (existing) {
    return {
      ...existing,
      personName: target.displayName,
      principalMinor: target.principalMinor,
      type: target.debtType,
      sourceType: 'group',
      sourceGroupId: group.id,
      sourceMemberId: target.memberId,
      status: 'pending',
      updatedAt: now,
    };
  }

  const created = createDebtFromInput(
    {
      personName: target.displayName,
      amount,
      type: target.debtType,
      note: `From group: ${group.name}`,
    },
    now
  );

  return {
    ...created,
    sourceType: 'group',
    sourceGroupId: group.id,
    sourceMemberId: target.memberId,
  };
}

export function isGroupSyncedDebt(debt: Debt, groupId: string): boolean {
  return debt.sourceType === 'group' && debt.sourceGroupId === groupId;
}

export function formatBalanceLine(displayName: string, netMinor: number, currencySymbol: string): string {
  const amount = minorToMajor(Math.abs(netMinor));
  const formatted = `${currencySymbol}${amount.toFixed(2)}`;
  if (netMinor > 0) return `${displayName} owes you ${formatted}`;
  return `You owe ${displayName} ${formatted}`;
}
