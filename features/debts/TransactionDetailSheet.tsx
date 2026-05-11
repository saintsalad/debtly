import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Button, HeroUINativeProvider } from 'heroui-native';
import * as Haptics from 'expo-haptics';
import { Bell, MessageSquare, Printer, Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Debt } from '@/features/debts/types';
import { Avatar } from '@/components/ui/Avatar';
import { ListDivider } from '@/components/ui/ListDivider';
import { useCurrency } from '@/hooks/useCurrency';
import { useDebtStore } from '@/stores/debtStore';
import { formatDate, getComputedStatus } from '@/lib/utils';
import { useColors, radius, space, type, type ColorPalette } from '@/lib/platform';
import {
  openSmsReminder,
  printTransaction,
  sendTransactionReminder,
} from '@/features/debts/transactionActions';

export interface TransactionDetailSheetHandle {
  present: (debt: Debt) => void;
  dismiss: () => void;
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function createStyles(palette: ColorPalette) {
  return StyleSheet.create({
    sheet: {
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      backgroundColor: palette.surface,
    },
    handle: {
      width: 40,
      backgroundColor: palette.opaqueSeparator,
    },
    content: {
      paddingHorizontal: space[4],
      paddingTop: space[2],
      paddingBottom: space[10],
      gap: space[6],
    },
    hero: {
      alignItems: 'center',
      paddingTop: space[2],
      gap: space[3],
    },
    personName: {
      ...type.title2,
      color: palette.label,
      textAlign: 'center',
    },
    summary: {
      ...type.subheadline,
      color: palette.labelSecondary,
      textAlign: 'center',
    },
    amount: {
      ...type.title1,
      fontWeight: '700',
      letterSpacing: -0.8,
      marginTop: space[1],
    },
    detailsCard: {
      backgroundColor: palette.fillSecondary,
      borderRadius: radius.lg,
      overflow: 'hidden',
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: space[4],
      paddingHorizontal: space[4],
      paddingVertical: space[4],
    },
    detailLabel: {
      ...type.subheadline,
      color: palette.labelSecondary,
      flex: 1,
    },
    detailValue: {
      ...type.subheadline,
      color: palette.label,
      flex: 1.2,
      textAlign: 'right',
    },
    actions: {
      gap: space[6],
    },
    actionGroup: {
      backgroundColor: palette.fillSecondary,
      borderRadius: radius.lg,
      overflow: 'hidden',
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      paddingHorizontal: space[4],
      paddingVertical: space[5],
    },
    actionRowPressed: {
      opacity: 0.82,
    },
    actionRowDisabled: {
      opacity: 0.45,
    },
    actionLabel: {
      ...type.body,
      color: palette.tint,
      flex: 1,
    },
    actionLabelDisabled: {
      color: palette.labelTertiary,
    },
    actionLabelDestructive: {
      color: palette.negative,
    },
  });
}

interface DetailRowProps {
  label: string;
  value: string;
  valueColor?: string;
  showSeparator?: boolean;
}

function DetailRow({ label, value, valueColor, showSeparator = false }: DetailRowProps) {
  const palette = useColors();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <>
      {showSeparator ? <ListDivider /> : null}
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>{label}</Text>
        <View style={{ flex: 1.2 }}>
          <Text style={[styles.detailValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
        </View>
      </View>
    </>
  );
}

interface ActionRowProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
  showSeparator?: boolean;
}

function ActionRow({
  icon,
  label,
  onPress,
  disabled = false,
  destructive = false,
  showSeparator = false,
}: ActionRowProps) {
  const palette = useColors();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <>
      {showSeparator ? <ListDivider /> : null}
      <Pressable
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.actionRow,
          pressed && !disabled && styles.actionRowPressed,
          disabled && styles.actionRowDisabled,
        ]}
        android_ripple={{ color: palette.fill, borderless: false }}
      >
        {icon}
        <Text
          style={[
            styles.actionLabel,
            destructive && styles.actionLabelDestructive,
            disabled && styles.actionLabelDisabled,
          ]}
        >
          {label}
        </Text>
      </Pressable>
    </>
  );
}

export const TransactionDetailSheet = forwardRef<TransactionDetailSheetHandle>((_, ref) => {
  const palette = useColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { fmt } = useCurrency();
  const { markPaid, deleteDebt } = useDebtStore();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [debt, setDebt] = useState<Debt | null>(null);
  const snapPoints = useMemo(() => ['82%'], []);

  const dismiss = useCallback(() => {
    sheetRef.current?.dismiss();
  }, []);

  const present = useCallback((nextDebt: Debt) => {
    setDebt((current) => {
      if (current?.id === nextDebt.id) {
        requestAnimationFrame(() => {
          sheetRef.current?.present();
        });
      }
      return nextDebt;
    });
  }, []);

  useImperativeHandle(ref, () => ({ present, dismiss }), [dismiss, present]);

  useLayoutEffect(() => {
    if (!debt) return;
    sheetRef.current?.present();
  }, [debt]);

  const handleDismiss = useCallback(() => {
    setDebt(null);
  }, []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
    ),
    []
  );

  const status = debt ? getComputedStatus(debt) : 'pending';
  const isCredit = debt?.type === 'owed_to_me';
  const isPending = status !== 'paid';
  const canRemind = Boolean(debt && isCredit && isPending);

  const amountColor =
    !debt
      ? palette.label
      : status === 'paid'
      ? palette.labelTertiary
      : isCredit
      ? palette.positive
      : palette.negative;

  const statusLabel =
    status === 'paid' ? 'Paid' : status === 'overdue' ? 'Overdue' : 'Pending';

  const summaryLine = debt
    ? [isCredit ? 'Owes you' : 'You owe', statusLabel].join(' · ')
    : '';

  const handleMarkPaid = () => {
    if (!debt) return;

    Alert.alert('Mark as paid?', `${debt.personName} will be marked as settled.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark paid',
        onPress: () => {
          markPaid(debt.id);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          dismiss();
        },
      },
    ]);
  };

  const handlePrint = () => {
    if (!debt) return;
    void printTransaction(debt, fmt);
  };

  const handleSendReminder = () => {
    if (!debt) return;
    void sendTransactionReminder(debt, fmt);
  };

  const handleSmsReminder = () => {
    if (!debt) return;
    void openSmsReminder(debt, fmt);
  };

  const handleDelete = () => {
    if (!debt) return;

    Alert.alert('Delete transaction?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteDebt(debt.id);
          dismiss();
        },
      },
    ]);
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onDismiss={handleDismiss}
      topInset={insets.top}
      bottomInset={insets.bottom}
      handleIndicatorStyle={styles.handle}
      backgroundStyle={styles.sheet}
    >
      {debt ? (
        <HeroUINativeProvider>
          <BottomSheetScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.hero}>
              <Avatar name={debt.personName} size={64} />
              <Text style={styles.personName} numberOfLines={2}>
                {debt.personName}
              </Text>
              <Text style={styles.summary}>{summaryLine}</Text>
              <Text style={[styles.amount, { color: amountColor }]}>
                {isCredit ? '+' : '−'}{fmt(debt.amount)}
              </Text>
            </View>

            <View style={styles.detailsCard}>
              {debt.note ? (
                <DetailRow label="Note" value={debt.note} />
              ) : null}
              {debt.dueDate ? (
                <DetailRow
                  label="Due date"
                  value={formatDate(debt.dueDate)}
                  valueColor={status === 'overdue' && isPending ? palette.negative : undefined}
                  showSeparator={Boolean(debt.note)}
                />
              ) : null}
              <DetailRow
                label="Added"
                value={formatFullDate(debt.createdAt)}
                showSeparator={Boolean(debt.note || debt.dueDate)}
              />
              {debt.updatedAt !== debt.createdAt ? (
                <DetailRow
                  label="Last updated"
                  value={formatFullDate(debt.updatedAt)}
                  showSeparator
                />
              ) : null}
            </View>

            <View style={styles.actions}>
              {isPending ? (
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onPress={handleMarkPaid}
                >
                  <Button.Label>Mark as Paid</Button.Label>
                </Button>
              ) : null}

              <View style={styles.actionGroup}>
                <ActionRow
                  icon={<Printer size={18} color={palette.tint} />}
                  label="Print"
                  onPress={handlePrint}
                />
                <ActionRow
                  icon={<Bell size={18} color={canRemind ? palette.tint : palette.labelTertiary} />}
                  label="Send reminder"
                  onPress={handleSendReminder}
                  disabled={!canRemind}
                  showSeparator
                />
                <ActionRow
                  icon={
                    <MessageSquare
                      size={18}
                      color={canRemind ? palette.tint : palette.labelTertiary}
                    />
                  }
                  label="Text reminder"
                  onPress={handleSmsReminder}
                  disabled={!canRemind}
                  showSeparator
                />
                <ActionRow
                  icon={<Trash2 size={18} color={palette.negative} />}
                  label="Delete"
                  onPress={handleDelete}
                  destructive
                  showSeparator
                />
              </View>
            </View>
          </BottomSheetScrollView>
        </HeroUINativeProvider>
      ) : null}
    </BottomSheetModal>
  );
});

TransactionDetailSheet.displayName = 'TransactionDetailSheet';
