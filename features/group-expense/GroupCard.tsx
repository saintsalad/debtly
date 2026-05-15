import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronRight } from 'lucide-react-native';
import { Avatar } from '@/components/ui/Avatar';
import { ListDivider } from '@/components/ui/ListDivider';
import { selectGroupBalances } from '@/features/group-expense/balanceEngine';
import type { GroupExpense, Settlement, SplitGroup } from '@/features/group-expense/types';
import { useCurrency } from '@/hooks/useCurrency';
import { useGlassSurfacePressed } from '@/lib/glassSurface';
import { minorToMajor } from '@/features/debts/money';
import { useColors, space, type, type ColorPalette } from '@/lib/platform';

interface GroupCardProps {
  group: SplitGroup;
  expenses: GroupExpense[];
  settlements: Settlement[];
  showSeparator?: boolean;
  dividerVariant?: 'default' | 'glass';
}

function balanceLine(summary: ReturnType<typeof selectGroupBalances>): string {
  if (summary.isSettled) return 'All settled';
  const net = summary.youAreOwedMinor - summary.youOweMinor;
  if (net > 0) return 'You are owed';
  if (net < 0) return 'You owe';
  return 'In balance';
}

function createStyles(palette: ColorPalette, rowPressedColor: string) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: space[4],
      paddingVertical: space[4],
      gap: space[3],
      minHeight: 68,
    },
    rowPressed: {
      backgroundColor: rowPressedColor,
    },
    body: { flex: 1, minWidth: 0, gap: space[1] },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space[2],
    },
    name: {
      ...type.subheadline,
      fontWeight: '500',
      color: palette.label,
      flex: 1,
    },
    amount: {
      ...type.callout,
      fontWeight: '600',
    },
    meta: {
      ...type.footnote,
      color: palette.labelSecondary,
    },
    positive: { color: palette.positive },
    negative: { color: palette.negative },
    neutral: { color: palette.labelTertiary },
  });
}

export function GroupCard({
  group,
  expenses,
  settlements,
  showSeparator = false,
  dividerVariant = 'glass',
}: GroupCardProps) {
  const router = useRouter();
  const palette = useColors();
  const rowPressedColor = useGlassSurfacePressed();
  const styles = useMemo(
    () => createStyles(palette, rowPressedColor),
    [palette, rowPressedColor]
  );
  const { fmt } = useCurrency();

  const summary = useMemo(
    () => selectGroupBalances(group, expenses, settlements),
    [group, expenses, settlements]
  );

  const net = summary.youAreOwedMinor - summary.youOweMinor;
  const memberCount = group.members.length;

  const handlePress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/group/[id]', params: { id: group.id } });
  }, [group.id, router]);

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={handlePress}
        accessibilityRole="button"
      >
        <Avatar name={group.name} size={44} />
        <View style={styles.body}>
          <View style={styles.topRow}>
            <Text style={styles.name} numberOfLines={1}>
              {group.name}
            </Text>
            <Text
              style={[
                styles.amount,
                summary.isSettled
                  ? styles.neutral
                  : net > 0
                    ? styles.positive
                    : net < 0
                      ? styles.negative
                      : styles.neutral,
              ]}
            >
              {summary.isSettled
                ? '—'
                : fmt(minorToMajor(Math.abs(net)))}
            </Text>
          </View>
          <Text style={styles.meta} numberOfLines={1}>
            {balanceLine(summary)} · {memberCount} members ·{' '}
            {fmt(minorToMajor(summary.totalSpendMinor))} spent
          </Text>
        </View>
        <ChevronRight size={16} color={palette.labelTertiary} />
      </Pressable>
      {showSeparator ? <ListDivider bleedHorizontal={space[4]} variant={dividerVariant} /> : null}
    </>
  );
}
