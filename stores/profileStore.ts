import { create } from 'zustand';

export type AppearancePreference = 'system' | 'light' | 'dark';

interface ProfileState {
  name: string;
  currency: string;
  appearance: AppearancePreference;
  /** When true, group-synced split bill balances appear on the Transactions tab. */
  showSplitBillsInTransactions: boolean;
  /** When true, receipt attachment photos use the thermal / bitmap-processed look. */
  receiptThermalLook: boolean;
  setName: (name: string) => void;
  setCurrency: (currency: string) => void;
  setAppearance: (appearance: AppearancePreference) => void;
  setShowSplitBillsInTransactions: (enabled: boolean) => void;
  setReceiptThermalLook: (enabled: boolean) => void;
}

export const useProfileStore = create<ProfileState>()((set) => ({
  name: 'Friend',
  currency: 'PHP',
  appearance: 'system',
  showSplitBillsInTransactions: false,
  receiptThermalLook: true,
  setName: (name) => set({ name }),
  setCurrency: (currency) => set({ currency }),
  setAppearance: (appearance) => set({ appearance }),
  setShowSplitBillsInTransactions: (showSplitBillsInTransactions) =>
    set({ showSplitBillsInTransactions }),
  setReceiptThermalLook: (receiptThermalLook) => set({ receiptThermalLook }),
}));
