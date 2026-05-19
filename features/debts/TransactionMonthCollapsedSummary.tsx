import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Debt } from '@/features/debts/types';
import { summarizeMonthSectionDebts, type TransactionDueMonthTier } from '@/features/debts/transactionSections';
import { useCurrency } from '@/hooks/useCurrency';
import { sansForWeight } from '@/lib/appFonts';
import { radius, space, type, useColors } from '@/lib/platform';

interface TransactionMonthCollapsedSummaryProps {
  debts: Debt[];
  dueMonthTier: TransactionDueMonthTier;
}

/** Single condensed row replacing an expanded month group (collapsed disclosure). */
export function TransactionMonthCollapsedSummary({
  debts,
  dueMonthTier,
}: TransactionMonthCollapsedSummaryProps) {
  const palette = useColors();
  const { fmt } = useCurrency();
  const mutedPast = dueMonthTier === 'past';

  const summary = useMemo(() => summarizeMonthSectionDebts(debts), [debts]);

  const subtitle = useMemo(() => {
    if (summary.count === 0) return 'Nothing to show.';
    const allSettled =
      summary.settledCount === summary.count ||
      (summary.owedToMeTotal <= 0.009 && summary.iOweTotal <= 0.009);
    if (allSettled && summary.count > 0) {
      return summary.count === 1 ? 'Paid in full.' : `${summary.settledCount} paid in full.`;
    }

    const parts: string[] = [];
    if (summary.owedToMeTotal > 0.009) {
      parts.push(`+${fmt(summary.owedToMeTotal)} owed to you`);
    }
    if (summary.iOweTotal > 0.009) {
      parts.push(`−${fmt(summary.iOweTotal)} you owe`);
    }

    const paidNote =
      summary.settledCount > 0 && summary.settledCount < summary.count
        ? `${summary.settledCount} paid`
        : null;

    let line = parts.join(' · ');
    if (!line && paidNote) line = paidNote;
    else if (line && paidNote) line = `${line} · ${paidNote}`;
    else if (!line) line = 'No remaining balance.';
    return line;
  }, [fmt, summary]);

  const headline =
    summary.count === 1
      ? '1 transaction'
      : `${summary.count} transactions`;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: space[4],
          paddingVertical: space[4],
          minHeight: 68,
          gap: space[3],
        },
        body: {
          flex: 1,
          gap: space[1],
        },
        headline: {
          ...type.subheadline,
          fontWeight: '600',
          fontFamily: sansForWeight('600'),
          color: mutedPast ? palette.labelSecondary : palette.label,
        },
        subtitle: {
          ...type.footnote,
          color: mutedPast ? palette.labelTertiary : palette.labelSecondary,
        },
        tallyPip: {
          width: 8,
          height: 38,
          borderRadius: radius.sm,
          backgroundColor: palette.fillSecondary,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: palette.opaqueSeparator,
        },
      }),
    [mutedPast, palette]
  );

  const a11y = `${headline}. ${subtitle}`;

  return (
    <View accessible accessibilityRole="text" accessibilityLabel={a11y} style={styles.root}>
      <View style={styles.tallyPip} importantForAccessibility="no" accessibilityElementsHidden />
      <View style={styles.body}>
        <Text style={styles.headline} numberOfLines={1}>
          {headline}
        </Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}
