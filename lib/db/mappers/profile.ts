import type { AppearancePreference } from '@/stores/profileStore';
import type { profileSettings } from '@/lib/db/schema';

export type ProfileRow = typeof profileSettings.$inferSelect;

export interface ProfileData {
  name: string;
  username: string | null;
  currency: string;
  appearance: AppearancePreference;
  showSplitBillsInTransactions: boolean;
  receiptThermalLook: boolean;
  /** Local `file://` or synced `https://` avatar — never stored on Convex directly except via `users.image` URL. */
  avatarUri: string | null;
}

export const DEFAULT_PROFILE: ProfileData = {
  name: 'Friend',
  username: null,
  currency: 'PHP',
  appearance: 'system',
  showSplitBillsInTransactions: false,
  receiptThermalLook: true,
  avatarUri: null,
};

export function profileToRow(data: ProfileData): ProfileRow {
  return {
    id: 1,
    name: data.name,
    username: data.username ?? null,
    currency: data.currency,
    appearance: data.appearance,
    showSplitBillsInTransactions: data.showSplitBillsInTransactions,
    receiptThermalLook: data.receiptThermalLook,
    avatarUri: data.avatarUri ?? null,
  };
}

export function rowToProfile(row: ProfileRow | undefined): ProfileData {
  if (!row) return { ...DEFAULT_PROFILE };
  return {
    name: row.name,
    username: row.username ?? null,
    currency: row.currency,
    appearance: row.appearance as AppearancePreference,
    showSplitBillsInTransactions: row.showSplitBillsInTransactions,
    receiptThermalLook: row.receiptThermalLook,
    avatarUri: row.avatarUri ?? null,
  };
}
