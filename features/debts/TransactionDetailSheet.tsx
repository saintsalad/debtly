import React, { useMemo } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { BottomSheet, Button, Chip } from 'heroui-native';
import { Calendar, Clock, StickyNote } from 'lucide-react-native';
import { Debt } from '@/features/debts/types';
import { Avatar } from '@/components/ui/Avatar';
import { useCurrency } from '@/hooks/useCurrency';
import { useDebtStore } from '@/stores/debtStore';
import { formatDate, getComputedStatus } from '@/lib/utils';
import { useColors, space, type, type ColorPalette } from '@/lib/platform';

interface TransactionDetailSheetProps {
  debt: Debt | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

function createStyles(palette: ColorPalette) {
  return StyleSheet.create({
    personHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      marginBottom: space[4],
    },
    personInfo: { flex: 1, gap: space[2] },
    personName: {
      ...type.title3,
      color: palette.label,
    },
    chips: {
      flexDirection: 'row',
      gap: space[2],
      flexWrap: 'wrap',
    },

    amountSection: {
      marginBottom: space[4],
    },
    amount: {
      fontSize: 38,
      fontWeight: '700',
      letterSpacing: -1.5,
    },

    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: palette.opaqueSeparator,
      marginBottom: space[4],
    },

    details: {
      gap: space[3],
      marginBottom: space[5],
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
    },
    detailText: {
      ...type.body,
      color: palette.labelSecondary,
      flex: 1,
    },

    actions: {
      gap: space[3],
    },
  });
}

export function TransactionDetailSheet({
  debt,
  isOpen,
  onOpenChange,
}: TransactionDetailSheetProps) {
  const palette = useColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { fmt } = useCurrency();
  const { markPaid, deleteDebt } = useDebtStore();

  if (!debt) return null;

  const status = getComputedStatus(debt);
  const isCredit = debt.type === 'owed_to_me';
  const isPending = status !== 'paid';

  const amountColor =
    status === 'paid'
      ? palette.labelTertiary
      : isCredit
      ? palette.positive
      : palette.negative;

  const statusChipColor: 'success' | 'danger' | 'default' =
    status === 'paid' ? 'success' : status === 'overdue' ? 'danger' : 'default';

  const handleMarkPaid = () => {
    markPaid(debt.id);
    onOpenChange(false);
  };

  const handleDelete = () => {
    Alert.alert('Delete transaction?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteDebt(debt.id);
          onOpenChange(false);
        },
      },
    ]);
  };

  return (
    <BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content snapPoints={['65%']}>
          <View style={styles.personHeader}>
            <Avatar name={debt.personName} size={56} />
            <View style={styles.personInfo}>
              <Text style={styles.personName} numberOfLines={1}>
                {debt.personName}
              </Text>
              <View style={styles.chips}>
                <Chip
                  variant="soft"
                  size="sm"
                  color={isCredit ? 'success' : 'danger'}
                  animation="disable-all"
                >
                  {isCredit ? 'Owes You' : 'You Owe'}
                </Chip>
                <Chip
                  variant="soft"
                  size="sm"
                  color={statusChipColor}
                  animation="disable-all"
                >
                  {status === 'paid' ? 'Paid' : status === 'overdue' ? 'Overdue' : 'Pending'}
                </Chip>
              </View>
            </View>
          </View>

          <View style={styles.amountSection}>
            <Text style={[styles.amount, { color: amountColor }]}>
              {isCredit ? '+' : '−'}{fmt(debt.amount)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.details}>
            {debt.note && (
              <View style={styles.detailRow}>
                <StickyNote size={18} color={palette.labelSecondary} />
                <Text style={styles.detailText}>{debt.note}</Text>
              </View>
            )}
            {debt.dueDate && (
              <View style={styles.detailRow}>
                <Calendar size={18} color={palette.labelSecondary} />
                <Text
                  style={[
                    styles.detailText,
                    status === 'overdue' && isPending && { color: palette.negative },
                  ]}
                >
                  Due {formatDate(debt.dueDate)}
                  {status === 'overdue' && isPending ? '  ·  Overdue' : ''}
                </Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Clock size={18} color={palette.labelSecondary} />
              <Text style={styles.detailText}>
                Added{' '}
                {new Date(debt.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            {isPending && (
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onPress={handleMarkPaid}
              >
                Mark as Paid
              </Button>
            )}
            <Button
              variant="danger-soft"
              size="lg"
              className="w-full"
              onPress={handleDelete}
            >
              Delete
            </Button>
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}
