import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '@/lib/storage';

export type AppearancePreference = 'system' | 'light' | 'dark';

interface ProfileState {
  name: string;
  currency: string;
  appearance: AppearancePreference;
  setName: (name: string) => void;
  setCurrency: (currency: string) => void;
  setAppearance: (appearance: AppearancePreference) => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      name: 'Friend',
      currency: 'PHP',
      appearance: 'system',
      setName: (name) => set({ name }),
      setCurrency: (currency) => set({ currency }),
      setAppearance: (appearance) => set({ appearance }),
    }),
    {
      name: 'debtly-profile',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
