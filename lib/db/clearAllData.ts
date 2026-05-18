import type { DebtlyDatabase } from '@/lib/db/client';
import { replaceBillSplits } from '@/lib/db/repositories/billSplitRepository';
import { replaceDebts } from '@/lib/db/repositories/debtRepository';
import { replaceGroupState } from '@/lib/db/repositories/groupRepository';
import { replaceProfile } from '@/lib/db/repositories/profileRepository';
import { DEFAULT_PROFILE } from '@/lib/db/mappers/profile';
import { INITIAL_GROUP_EXPENSE_STATE } from '@/lib/mocks/initialGroupExpenses';
import { useBillSplitStore } from '@/stores/billSplitStore';
import { useDebtStore } from '@/stores/debtStore';
import { useGroupExpenseStore } from '@/stores/groupExpenseStore';
import { useProfileStore } from '@/stores/profileStore';

export async function clearAllData(db: DebtlyDatabase): Promise<void> {
  await replaceDebts(db, []);
  await replaceGroupState(db, INITIAL_GROUP_EXPENSE_STATE);
  await replaceBillSplits(db, []);
  await replaceProfile(db, DEFAULT_PROFILE);

  useDebtStore.setState({ debts: [] });
  useGroupExpenseStore.setState(INITIAL_GROUP_EXPENSE_STATE);
  useBillSplitStore.setState({ splits: [] });
  useProfileStore.setState({
    name: DEFAULT_PROFILE.name,
    currency: DEFAULT_PROFILE.currency,
    appearance: DEFAULT_PROFILE.appearance,
    showSplitBillsInTransactions: DEFAULT_PROFILE.showSplitBillsInTransactions,
    receiptThermalLook: DEFAULT_PROFILE.receiptThermalLook,
  });
}

export async function saveProfileToDb(
  db: DebtlyDatabase,
  data: ProfileData
): Promise<void> {
  await replaceProfile(db, data);
}
