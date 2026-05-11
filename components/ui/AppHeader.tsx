import React, { useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { Avatar } from '@/components/ui/Avatar';
import { useCollapsibleHeader } from '@/components/ui/collapsible-header-context';
import { useDebtStore } from '@/stores/debtStore';
import { useProfileStore } from '@/stores/profileStore';
import { useColors, space, type } from '@/lib/platform';
import { getComputedStatus } from '@/lib/utils';

const APP_NAME = 'Debtly';

export function AppHeader() {
  const palette = useColors();
  const insets = useSafeAreaInsets();
  const { headerTranslateY, registerHeaderHeight, resetHeader } = useCollapsibleHeader();
  const router = useRouter();
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerTranslateY.value }],
  }));

  useFocusEffect(
    useCallback(() => {
      resetHeader();
    }, [resetHeader])
  );
  const name = useProfileStore((s) => s.name);
  const debts = useDebtStore((s) => s.debts);

  const { overdueCount, pendingCount } = useMemo(() => {
    const overdue = debts.filter((debt) => getComputedStatus(debt) === 'overdue').length;
    const pending = debts.filter((debt) => debt.status === 'pending').length;
    return { overdueCount: overdue, pendingCount: pending };
  }, [debts]);

  const badgeCount = overdueCount > 0 ? overdueCount : pendingCount;

  const showNotifications = () => {
    if (debts.length === 0) {
      Alert.alert('Notifications', "You're all caught up.");
      return;
    }

    const lines: string[] = [];
    if (overdueCount > 0) lines.push(`${overdueCount} overdue`);
    if (pendingCount > 0) lines.push(`${pendingCount} pending`);

    Alert.alert('Updates', lines.join(' · '));
  };

  return (
    <Animated.View
      onLayout={(event) => registerHeaderHeight(event.nativeEvent.layout.height)}
      style={[
        styles.headerWrap,
        { backgroundColor: palette.surface, paddingTop: insets.top },
        animatedStyle,
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.appName, { color: palette.label }]}>{APP_NAME}</Text>
        <View style={styles.actions}>
          <Pressable
            style={[styles.notificationButton, { backgroundColor: palette.fill }]}
            onPress={showNotifications}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Bell size={22} color={palette.label} />
            {badgeCount > 0 ? (
              <View style={[styles.badge, { backgroundColor: palette.negative }]}>
                <Text style={styles.badgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable
            onPress={() => router.push('/profile')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
          >
            <Avatar name={name} size={36} />
          </Pressable>
        </View>
      </View>
      <View style={[styles.headerBorder, { backgroundColor: palette.opaqueSeparator }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[4],
    paddingTop: space[2],
    paddingBottom: space[3],
  },
  headerBorder: {
    height: StyleSheet.hairlineWidth,
  },
  appName: {
    ...type.title2,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  notificationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    ...type.caption2,
    color: '#fff',
    fontWeight: '600',
  },
});
