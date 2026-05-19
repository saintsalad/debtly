import type { DebtlyDatabase } from '@/lib/db/client';
import { replaceBillSplits } from '@/lib/db/repositories/billSplitRepository';
import { replaceDebts } from '@/lib/db/repositories/debtRepository';
import { replaceGroupState } from '@/lib/db/repositories/groupRepository';
import { replaceProfile } from '@/lib/db/repositories/profileRepository';
import { deleteProfileAvatarFile } from '@/lib/profile/compressProfileAvatar';
import { DEFAULT_PROFILE } from '@/lib/db/mappers/profile';
import { EMPTY_GROUP_EXPENSE_STATE } from '@/features/group-expense/emptyGroupExpenseState';
import { useBillSplitStore } from '@/stores/billSplitStore';
import { useAccountInviteStore } from '@/stores/accountInviteStore';
import { useDebtStore } from '@/stores/debtStore';
import { useGroupExpenseStore } from '@/stores/groupExpenseStore';
import { useProfileStore } from '@/stores/profileStore';

export async function clearAllData(db: DebtlyDatabase): Promise<void> {
  await deleteProfileAvatarFile();
  await replaceDebts(db, []);
  await replaceGroupState(db, EMPTY_GROUP_EXPENSE_STATE);
  await replaceBillSplits(db, []);
  await replaceProfile(db, DEFAULT_PROFILE);

  useDebtStore.setState({ debts: [] });
  useGroupExpenseStore.setState(EMPTY_GROUP_EXPENSE_STATE);
  useBillSplitStore.setState({ splits: [] });
  useAccountInviteStore.getState().setPendingInviteCode(null);
  useProfileStore.setState({
    name: DEFAULT_PROFILE.name,
    username: DEFAULT_PROFILE.username,
    currency: DEFAULT_PROFILE.currency,
    appearance: DEFAULT_PROFILE.appearance,
    showSplitBillsInTransactions: DEFAULT_PROFILE.showSplitBillsInTransactions,
    receiptThermalLook: DEFAULT_PROFILE.receiptThermalLook,
    avatarUri: DEFAULT_PROFILE.avatarUri,
  });
}
