import { Platform } from 'react-native';
import { glassBorderStyle } from '@/lib/glassBorder';

/** Matches Transactions tab segmented labels (three-way filter). */
export const TRANSACTION_DEBT_SEGMENT_LABELS = ['All', 'Owed you', 'You owe'] as const;

/** Labels for Add / Edit debt direction — wording matches Transactions filtered tabs. */
export const ADD_DEBT_DIRECTION_LABELS: readonly ['Owed you', 'You owe'] = [
  TRANSACTION_DEBT_SEGMENT_LABELS[1],
  TRANSACTION_DEBT_SEGMENT_LABELS[2],
];

export function debtSegmentGlassTrack(colorScheme: 'light' | 'dark') {
  return {
    backgroundColor:
      colorScheme === 'dark' ? 'rgba(28, 28, 30, 0.42)' : 'rgba(120, 120, 128, 0.14)',
    ...glassBorderStyle(colorScheme, 'surface'),
  };
}

/** Touch-friendly track height aligned with Transactions toolbar. */
export function debtSegmentMinTouchHeight() {
  return Platform.OS === 'ios' ? 44 : 46;
}
