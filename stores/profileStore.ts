import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '@/lib/storage';

interface ProfileState {
  name: string;
  currency: string;
  setName: (name: string) => void;
  setCurrency: (currency: string) => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      name: 'Friend',
      currency: 'PHP',
      setName: (name) => set({ name }),
      setCurrency: (currency) => set({ currency }),
    }),
    {
      name: 'debtly-profile',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
