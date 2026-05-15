import React, { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { BillSplit } from '@/features/bill-split/types';
import { useBillSplitStore } from '@/stores/billSplitStore';
import { useCurrency } from '@/hooks/useCurrency';
import { ListDivider } from '@/components/ui/ListDivider';
import { useGlassInsetFill } from '@/lib/glassSurface';
import { useColors, space, type, type ColorPalette } from '@/lib/platform';

interface BillSplitCardProps {
  split: BillSplit;
  showSeparator?: boolean;
  dividerVariant?: 'default' | 'glass';
}

function createStyles(palette: ColorPalette, insetFill: string) {
  return StyleSheet.create({
    card: {
      paddingHorizontal: space[4],
      paddingVertical: space[4],
      gap: space[3],
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: space[3],
    },
    headerBody: {
      flex: 1,
      gap: space[1],
    },
    title: {
      ...type.headline,
      color: palette.label,
    },
    meta: {
      ...type.footnote,
      color: palette.labelSecondary,
    },
    totalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: space[2],
      paddingHorizontal: space[3],
      borderRadius: 12,
      backgroundColor: insetFill,
    },
    totalLabel: {
      ...type.subheadline,
      color: palette.labelSecondary,
    },
    totalAmount: {
      ...type.headline,
      color: palette.label,
    },
    participantRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      paddingVertical: space[2],
    },
    participantPressed: {
      opacity: 0.88,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: palette.warning,
    },
    statusDotPaid: {
      backgroundColor: palette.positive,
    },
    participantName: {
      ...type.subheadline,
      color: palette.label,
      flex: 1,
    },
    participantNamePaid: {
      color: palette.labelSecondary,
      textDecorationLine: 'line-through',
    },
    participantAmount: {
      ...type.callout,
      fontWeight: '600',
      color: palette.label,
    },
    participantAmountPaid: {
      color: palette.labelTertiary,
    },
    cardGap: {
      height: space[3],
    },
  });
}

export function BillSplitCard({
  split,
  showSeparator = false,
  dividerVariant = 'glass',
}: BillSplitCardProps) {
  const palette = useColors();
  const insetFill = useGlassInsetFill();
  const styles = useMemo(() => createStyles(palette, insetFill), [palette, insetFill]);
  const { fmt } = useCurrency();
  const toggleParticipantPaid = useBillSplitStore((s) => s.toggleParticipantPaid);
  const deleteSplit = useBillSplitStore((s) => s.deleteSplit);

  const settledCount = split.participants.filter((participant) => participant.paid).length;
  const outstanding = split.participants
    .filter((participant) => !participant.paid)
    .reduce((sum, participant) => sum + participant.amount, 0);

  const confirmDelete = () => {
    Alert.alert('Delete split?', 'This bill split will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteSplit(split.id) },
    ]);
  };

  return (
    <>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerBody}>
            <Text style={styles.title}>{split.title}</Text>
            <Text style={styles.meta}>
              {settledCount}/{split.participants.length} settled · {fmt(outstanding)} outstanding
            </Text>
          </View>
          <Pressable onPress={confirmDelete} hitSlop={8} accessibilityRole="button">
            <Trash2 size={18} color={palette.labelTertiary} />
          </Pressable>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>{fmt(split.total)}</Text>
        </View>

        {split.participants.map((participant, index) => (
          <View key={participant.id}>
            <Pressable
              style={({ pressed }) => [styles.participantRow, pressed && styles.participantPressed]}
              onPress={() => toggleParticipantPaid(split.id, participant.id)}
            >
              <View style={[styles.statusDot, participant.paid && styles.statusDotPaid]} />
              <Text
                style={[styles.participantName, participant.paid && styles.participantNamePaid]}
                numberOfLines={1}
              >
                {participant.name}
              </Text>
              <Text
                style={[styles.participantAmount, participant.paid && styles.participantAmountPaid]}
              >
                {fmt(participant.amount)}
              </Text>
            </Pressable>
            {index < split.participants.length - 1 ? (
              <ListDivider bleedHorizontal={space[4]} variant={dividerVariant} />
            ) : null}
          </View>
        ))}
      </View>
      {showSeparator ? <View style={styles.cardGap} /> : null}
    </>
  );
}
