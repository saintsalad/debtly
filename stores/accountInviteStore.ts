import { create } from 'zustand';

interface AccountInviteState {
  pendingInviteCode: string | null;
  setPendingInviteCode: (code: string | null) => void;
}

/** Deep-link invite code waiting until Convex signup completes when invite feature is gated. */
export const useAccountInviteStore = create<AccountInviteState>()((set) => ({
  pendingInviteCode: null,
  setPendingInviteCode: (code) => set({ pendingInviteCode: code }),
}));
