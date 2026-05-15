import { Avatar } from '@/components/ui/Avatar';
import { HeaderIconButton } from '@/components/ui/HeaderIconButton';
import { ListDivider } from '@/components/ui/ListDivider';
import {
  getAccruedInterest,
  getPaymentProgress,
  getPrincipalAmount,
  getRecurrenceLabel,
  getRemainingBalance,
  getTotalPaid,
} from '@/features/debts/debtCalculations';
import { getInterestAccrualLabel, interestRateFromBps } from '@/features/debts/interestEngine';
import { PartialPaymentSheet, type PartialPaymentSheetHandle } from '@/features/debts/PartialPaymentSheet';
import { PaymentProgress } from '@/features/debts/PaymentProgress';
import { RecordPaymentSheet, type RecordPaymentSheetHandle } from '@/features/debts/RecordPaymentSheet';
import {
  openSmsReminder,
  printTransaction,
  sendTransactionReminder,
} from '@/features/debts/transactionActions';
import { useCurrency } from '@/hooks/useCurrency';
import { layout, radius, space, type, useColors, type ColorPalette } from '@/lib/platform';
import { useStatusBarScrollFade } from '@/lib/statusBarScrollFade';
import { formatDate, getComputedStatus } from '@/lib/utils';
import { useDebtStore } from '@/stores/debtStore';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Button, HeroUINativeProvider } from 'heroui-native';
import { Bell, MessageSquare, Pencil, Printer, Trash2, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TransactionDetailScreenProps {
  debtId: string;
  onClose: () => void;
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
    screen: {
      flex: 1,
      backgroundColor: palette.bg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: space[5],
      paddingBottom: space[3],
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.opaqueSeparator,
    },
    headerTitle: {
      flex: 1,
      ...type.headline,
      color: palette.label,
      textAlign: 'center',
    },
    headerSpacer: {
      width: 36,
      height: 36,
    },
    content: {
      paddingHorizontal: space[4],
      paddingTop: space[2],
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
      gap: space[4],
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

export function TransactionDetailScreen({ debtId, onClose }: TransactionDetailScreenProps) {
  const palette = useColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const router = useRouter();
  const { fmt } = useCurrency();
  const { markPaid, deleteDebt, recordPayment } = useDebtStore();
  const insets = useSafeAreaInsets();
  const partialPaymentSheetRef = useRef<PartialPaymentSheetHandle>(null);
  const recordPaymentSheetRef = useRef<RecordPaymentSheetHandle>(null);
  const debt = useDebtStore((state) => state.debts.find((item) => item.id === debtId));
  const { onScroll: statusBarScrollFadeOnScroll } = useStatusBarScrollFade();

  useEffect(() => {
    if (!debt) {
      onClose();
    }
  }, [debt, onClose]);

  useEffect(() => {
    return () => {
      recordPaymentSheetRef.current?.dismiss();
      partialPaymentSheetRef.current?.dismiss();
    };
  }, []);

  if (!debt) {
    return null;
  }

  const status = getComputedStatus(debt);
  const isCredit = debt.type === 'owed_to_me';
  const isPending = status !== 'paid';
  const canRemind = isCredit && isPending;
  const remainingBalance = getRemainingBalance(debt);
  const accruedInterest = getAccruedInterest(debt);
  const totalPaid = getTotalPaid(debt);
  const paymentProgress = getPaymentProgress(debt);
  const hasPartialPayment = totalPaid > 0 && isPending;

  const amountColor =
    status === 'paid'
      ? palette.labelTertiary
      : isCredit
        ? palette.positive
        : palette.negative;

  const statusLabel =
    status === 'paid'
      ? 'Paid'
      : status === 'partial'
        ? 'Partially paid'
        : status === 'overdue'
          ? 'Overdue'
          : 'Pending';

  const summaryLine = [isCredit ? 'Owes you' : 'You owe', statusLabel].join(' · ');

  const handleRecordPayment = (amount: number): boolean => {
    const error = recordPayment(debt.id, { amount });
    if (error) {
      Alert.alert('Unable to record payment', error);
      return false;
    }

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const nextDebt = useDebtStore.getState().debts.find((item) => item.id === debt.id);
    if (!nextDebt || getComputedStatus(nextDebt) === 'paid') {
      onClose();
    }

    return true;
  };

  const confirmFullPayment = () => {
    Alert.alert('Record full payment?', `${fmt(remainingBalance)} will be marked as settled.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Record full payment',
        onPress: () => {
          markPaid(debt.id);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onClose();
        },
      },
    ]);
  };

  const beginPartialPayment = () => {
    partialPaymentSheetRef.current?.present(remainingBalance);
  };

  const handlePaymentPress = () => {
    recordPaymentSheetRef.current?.present();
  };

  const handlePrint = () => {
    void printTransaction(debt, fmt);
  };

  const handleSendReminder = () => {
    void sendTransactionReminder(debt, fmt);
  };

  const handleSmsReminder = () => {
    void openSmsReminder(debt, fmt);
  };

  const handleDelete = () => {
    Alert.alert('Delete transaction?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteDebt(debt.id);
          onClose();
        },
      },
    ]);
  };

  const handleEdit = () => {
    router.push({
      pathname: '/edit-transaction/[id]',
      params: { id: debt.id },
    });
  };

  return (
    <BottomSheetModalProvider>
      <View style={styles.screen}>
        <HeroUINativeProvider>
          <View style={[styles.header, { paddingTop: insets.top + space[2] }]}>
            <HeaderIconButton icon={X} accessibilityLabel="Close" onPress={onClose} />
            <Text style={styles.headerTitle}>Transaction</Text>
            <HeaderIconButton icon={Pencil} accessibilityLabel="Edit transaction" onPress={handleEdit} />
          </View>

          <Animated.ScrollView
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={statusBarScrollFadeOnScroll}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.content,
              { paddingBottom: insets.bottom + layout.screenPaddingBottom },
            ]}
          >
            <View style={styles.hero}>
              <Avatar name={debt.personName} size={64} tone={isCredit ? 'credit' : 'debit'} />
              <Text style={styles.personName} numberOfLines={2}>
                {debt.personName}
              </Text>
              <Text style={styles.summary}>{summaryLine}</Text>
              <Text style={[styles.amount, { color: amountColor }]}>
                {isCredit ? '+' : '−'}
                {fmt(remainingBalance)}
              </Text>
              {hasPartialPayment ? (
                <PaymentProgress
                  paidLabel={`${fmt(totalPaid)} paid`}
                  remainingLabel={`${fmt(remainingBalance)} left`}
                  progress={paymentProgress}
                />
              ) : null}
            </View>

            <View style={styles.detailsCard}>
              <DetailRow label="Principal" value={fmt(getPrincipalAmount(debt))} />
              {debt.interestRateBps ? (
                <DetailRow
                  label="Interest rate"
                  value={`${interestRateFromBps(debt.interestRateBps)}% APR`}
                  showSeparator
                />
              ) : null}
              {debt.interestRateBps && debt.interestAccrualFrequency ? (
                <DetailRow
                  label="Interest accrual"
                  value={getInterestAccrualLabel(debt.interestAccrualFrequency)}
                  showSeparator
                />
              ) : null}
              {accruedInterest > 0 ? (
                <DetailRow label="Accrued interest" value={fmt(accruedInterest)} showSeparator />
              ) : null}
              {hasPartialPayment ? (
                <DetailRow label="Paid to date" value={fmt(totalPaid)} showSeparator />
              ) : null}
              {hasPartialPayment ? (
                <DetailRow label="Remaining" value={fmt(remainingBalance)} showSeparator />
              ) : null}
              {debt.isRecurring && debt.recurrenceInterval ? (
                <DetailRow
                  label="Recurring"
                  value={getRecurrenceLabel(debt.recurrenceInterval)}
                  showSeparator
                />
              ) : null}
              {debt.note ? <DetailRow label="Note" value={debt.note} /> : null}
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
                <Button variant="primary" size="lg" className="w-full" onPress={handlePaymentPress}>
                  <Button.Label>Record payment</Button.Label>
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
          </Animated.ScrollView>
        </HeroUINativeProvider>
      </View>
      <RecordPaymentSheet
        ref={recordPaymentSheetRef}
        onSelectFull={confirmFullPayment}
        onSelectPartial={beginPartialPayment}
      />
      <PartialPaymentSheet ref={partialPaymentSheetRef} onSubmit={handleRecordPayment} />
    </BottomSheetModalProvider>
  );
}
