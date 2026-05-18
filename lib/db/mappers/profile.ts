import type { AppearancePreference } from '@/stores/profileStore';
import type { profileSettings } from '@/lib/db/schema';

export type ProfileRow = typeof profileSettings.$inferSelect;

export interface ProfileData {
  name: string;
  currency: string;
  appearance: AppearancePreference;
  showSplitBillsInTransactions: boolean;
  receiptThermalLook: boolean;
}

export const DEFAULT_PROFILE: ProfileData = {
  name: 'Friend',
  currency: 'PHP',
  appearance: 'system',
  showSplitBillsInTransactions: false,
  receiptThermalLook: true,
};

export function profileToRow(data: ProfileData): ProfileRow {
  return {
    id: 1,
    name: data.name,
    currency: data.currency,
    appearance: data.appearance,
    showSplitBillsInTransactions: data.showSplitBillsInTransactions,
    receiptThermalLook: data.receiptThermalLook,
  };
}

export function rowToProfile(row: ProfileRow | undefined): ProfileData {
  if (!row) return { ...DEFAULT_PROFILE };
  return {
    name: row.name,
    currency: row.currency,
    appearance: row.appearance as AppearancePreference,
    showSplitBillsInTransactions: row.showSplitBillsInTransactions,
    receiptThermalLook: row.receiptThermalLook,
  };
}
