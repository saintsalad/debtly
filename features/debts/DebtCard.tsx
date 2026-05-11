import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Debt } from '@/features/debts/types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { formatDate, getComputedStatus } from '@/lib/utils';
import { useDebtStore } from '@/stores/debtStore';
import { useCurrency } from '@/hooks/useCurrency';

interface DebtCardProps {
  debt: Debt;
  index: number;
}

export function DebtCard({ debt, index }: DebtCardProps) {
  const { markPaid, deleteDebt } = useDebtStore();
  const { fmt } = useCurrency();
  const swipeableRef = useRef<Swipeable>(null);

  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);

  const status = getComputedStatus(debt);
  const isCredit = debt.type === 'owed_to_me';

  useEffect(() => {
    opacity.value = withDelay(index * 55, withTiming(1, { duration: 280 }));
    translateY.value = withDelay(index * 55, withSpring(0, { damping: 18, stiffness: 200 }));
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.975, { damping: 15 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const handleMarkPaid = () => {
    swipeableRef.current?.close();
    markPaid(debt.id);
  };

  const handleDelete = () => {
    Alert.alert('Delete Debt', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel', onPress: () => swipeableRef.current?.close() },
      { text: 'Delete', style: 'destructive', onPress: () => deleteDebt(debt.id) },
    ]);
  };

  const renderRightActions = () => (
    <View style={styles.actionsRow}>
      {debt.status === 'pending' && (
        <TouchableOpacity style={[styles.action, styles.paidAction]} onPress={handleMarkPaid}>
          <Text style={styles.actionEmoji}>✓</Text>
          <Text style={styles.actionLabel}>Paid</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={[styles.action, styles.deleteAction]} onPress={handleDelete}>
        <Text style={styles.actionEmoji}>🗑</Text>
        <Text style={styles.actionLabel}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
    >
      <Animated.View style={cardStyle}>
        <Pressable
          style={styles.card}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <Avatar name={debt.personName} size={46} />
          <View style={styles.content}>
            <View style={styles.topRow}>
              <Text style={styles.name} numberOfLines={1}>
                {debt.personName}
              </Text>
              <Text style={[styles.amount, { color: isCredit ? '#16A34A' : '#DC2626' }]}>
                {isCredit ? '+' : '−'}{fmt(debt.amount)}
              </Text>
            </View>
            {!!debt.note && (
              <Text style={styles.note} numberOfLines={1}>{debt.note}</Text>
            )}
            <View style={styles.bottomRow}>
              {debt.dueDate ? (
                <Text style={styles.dueDate}>Due {formatDate(debt.dueDate)}</Text>
              ) : (
                <View />
              )}
              <Badge status={status} />
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    gap: 14,
    marginHorizontal: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  content: { flex: 1, gap: 4 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  name: { flex: 1, fontSize: 15, fontWeight: '600', color: '#111827' },
  amount: { fontSize: 15, fontWeight: '700', letterSpacing: -0.3 },
  note: { fontSize: 12, color: '#9CA3AF' },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  dueDate: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingRight: 20,
    paddingBottom: 10,
    gap: 8,
  },
  action: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    gap: 2,
    paddingVertical: 8,
  },
  paidAction: { backgroundColor: '#16A34A' },
  deleteAction: { backgroundColor: '#DC2626' },
  actionEmoji: { fontSize: 16 },
  actionLabel: { fontSize: 11, color: '#fff', fontWeight: '600' },
});
