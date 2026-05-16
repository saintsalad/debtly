import type { ColorPalette } from '@/lib/platform';
import type { TransactionDuePresentationTone } from '@/lib/utils';

/** Pill colors for actionable due states (list rows + transaction detail). */
export function dueUrgencyBadgeColors(
  palette: ColorPalette,
  tone: TransactionDuePresentationTone
): { bg: string; fg: string; fontWeight: '500' | '600' | '700' } | null {
  switch (tone) {
    case 'overdue':
      return { bg: palette.negativeSoft, fg: palette.negative, fontWeight: '600' };
    case 'due_today':
      return { bg: palette.warningSoft, fg: palette.warning, fontWeight: '700' };
    case 'due_tomorrow':
      return { bg: palette.warningSoft, fg: palette.warning, fontWeight: '600' };
    default:
      return null;
  }
}
