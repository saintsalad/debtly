import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Platform } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withDelay, withTiming,
} from 'react-native-reanimated';
import { Check, Trash2 } from 'lucide-react-native';
import { Debt } from '@/features/debts/types';
import { getRemainingBalance } from '@/features/debts/debtCalculations';
import { Avatar } from '@/components/ui/Avatar';
import { formatDate, getComputedStatus } from '@/lib/utils';
import { notifySuccess } from '@/lib/appToast';
import { sansForWeight } from '@/lib/appFonts';
import { useCardShadow, useColors, type, space, radius, type ColorPalette } from '@/lib/platform';
import { useDebtStore } from '@/stores/debtStore';
import { useCurrency } from '@/hooks/useCurrency';
import { useToast } from 'heroui-native';

interface DebtCardProps {
  debt: Debt;
  index: number;
}

function createStyles(palette: ColorPalette, shadow: ReturnType<typeof useCardShadow>) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: palette.surface,
      marginHorizontal: space[5],
      marginBottom: 1,
      paddingHorizontal: space[4],
      paddingVertical: 14,
      gap: space[3],
      ...shadow,
    },
    body: { flex: 1, gap: 4 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space[2],
    },
    name: {
      ...type.subheadline,
      fontWeight: '500',
      fontFamily: sansForWeight('500'),
      color: palette.label,
      flex: 1,
    },
    amount: {
      fontSize: 15,
      fontWeight: '600',
      fontFamily: sansForWeight('600'),
      letterSpacing: -0.3,
    },
    note: {
      ...type.footnote,
      color: palette.labelSecondary,
      flex: 1,
    },
    notePlaceholder: { flex: 1 },
    metaRight: { alignItems: 'flex-end' },
    dueDate: {
      ...type.caption1,
    },
    actionsContainer: {
      flexDirection: 'row',
      alignItems: 'stretch',
      marginRight: space[5],
      marginBottom: 1,
      gap: 4,
      borderRadius: radius.card,
      overflow: 'hidden',
    },
    swipeAction: {
      width: 68,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      paddingBottom: Platform.OS === 'ios' ? 2 : 0,
    },
    swipeLabel: {
      ...type.caption2,
      color: '#fff',
      fontWeight: '600',
      fontFamily: sansForWeight('600'),
    },
  });
}

export function DebtCard({ debt, index }: DebtCardProps) {
  const palette = useColors();
  const shadow = useCardShadow();
  const styles = useMemo(() => createStyles(palette, shadow), [palette, shadow]);
  const { markPaid, deleteDebt } = useDebtStore();
  const { fmt } = useCurrency();
  const { toast } = useToast();
  const swipeableRef = useRef<Swipeable>(null);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);
  const scale = useSharedValue(1);

  const status = getComputedStatus(debt);
  const isCredit = debt.type === 'owed_to_me';
  const remainingBalance = getRemainingBalance(debt);

  const amountColor = status === 'paid'
    ? palette.labelTertiary
    : isCredit
      ? palette.positive
      : palette.negative;

  const dueColor = status === 'overdue'
    ? palette.negative
    : status === 'paid'
      ? palette.labelTertiary
      : palette.labelSecondary;

  useEffect(() => {
    const delay = index * 48;
    opacity.value = withDelay(delay, withTiming(1, { duration: 260 }));
    translateY.value = withDelay(delay, withSpring(0, { damping: 20, stiffness: 220 }));
  }, [index, opacity, translateY]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  const handleDelete = () => {
    Alert.alert('Delete debt?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel', onPress: () => swipeableRef.current?.close() },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteDebt(debt.id);
          notifySuccess(toast, 'Transaction removed');
        },
      },
    ]);
  };

  const handleMarkPaid = () => {
    swipeableRef.current?.close();
    markPaid(debt.id);
    notifySuccess(toast, 'Marked as paid');
  };

  const renderRightActions = () => (
    <View style={styles.actionsContainer}>
      {debt.status === 'pending' && (
        <Pressable
          style={[styles.swipeAction, { backgroundColor: palette.positive }]}
          onPress={handleMarkPaid}
          android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
        >
          <Check size={20} color="#fff" />
          <Text style={styles.swipeLabel}>Paid</Text>
        </Pressable>
      )}
      <Pressable
        style={[styles.swipeAction, { backgroundColor: palette.negative }]}
        onPress={handleDelete}
        android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
      >
        <Trash2 size={20} color="#fff" />
        <Text style={styles.swipeLabel}>Delete</Text>
      </Pressable>
    </View>
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      friction={2}
      rightThreshold={44}
      overshootRight={false}
    >
      <Animated.View style={cardStyle}>
        <Pressable
          style={styles.card}
          onPressIn={() => { scale.value = withSpring(0.978, { damping: 18 }); }}
          onPressOut={() => { scale.value = withSpring(1, { damping: 18 }); }}
        >
          <Avatar name={debt.personName} seed={debt.id} size={42} tone={isCredit ? 'credit' : 'debit'} />

          <View style={styles.body}>
            <View style={styles.row}>
              <Text style={styles.name} numberOfLines={1}>{debt.personName}</Text>
              <Text style={[styles.amount, { color: amountColor }]}>
                {isCredit ? '+' : '−'}{fmt(remainingBalance)}
              </Text>
            </View>
            <View style={styles.row}>
              {debt.note ? (
                <Text style={styles.note} numberOfLines={1}>{debt.note}</Text>
              ) : (
                <View style={styles.notePlaceholder} />
              )}
              <View style={styles.metaRight}>
                {debt.dueDate && status !== 'paid' ? (
                  <Text style={[styles.dueDate, { color: dueColor }]}>
                    {formatDate(debt.dueDate)}
                  </Text>
                ) : null}
                {status === 'paid' ? (
                  <Text style={[styles.dueDate, { color: palette.positive }]}>Paid</Text>
                ) : null}
              </View>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </Swipeable>
  );
}
