import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AddBillSplitInput, BillSplit } from '@/features/bill-split/types';
import { zustandStorage } from '@/lib/storage';
import { generateId } from '@/lib/utils';

interface BillSplitState {
  splits: BillSplit[];
  addSplit: (input: AddBillSplitInput) => void;
  toggleParticipantPaid: (splitId: string, participantId: string) => void;
  deleteSplit: (id: string) => void;
}

export const useBillSplitStore = create<BillSplitState>()(
  persist(
    (set) => ({
      splits: [],
      addSplit: ({ title, total, participantNames }) => {
        const names = participantNames
          .map((name) => name.trim())
          .filter(Boolean);
        if (!title.trim() || total <= 0 || names.length === 0) return;

        const share = total / (names.length + 1);
        const now = new Date().toISOString();
        const split: BillSplit = {
          id: generateId(),
          title: title.trim(),
          total,
          participants: names.map((name) => ({
            id: generateId(),
            name,
            amount: share,
            paid: false,
          })),
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({ splits: [split, ...state.splits] }));
      },
      toggleParticipantPaid: (splitId, participantId) =>
        set((state) => ({
          splits: state.splits.map((split) => {
            if (split.id !== splitId) return split;
            return {
              ...split,
              updatedAt: new Date().toISOString(),
              participants: split.participants.map((participant) =>
                participant.id === participantId
                  ? { ...participant, paid: !participant.paid }
                  : participant
              ),
            };
          }),
        })),
      deleteSplit: (id) =>
        set((state) => ({
          splits: state.splits.filter((split) => split.id !== id),
        })),
    }),
    {
      name: 'debtly-bill-splits',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
