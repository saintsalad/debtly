import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, type } from '@/lib/platform';
import { useAddDebt } from '@/lib/addDebtContext';

function TabItem({
  isFocused,
  options,
  onPress,
}: {
  isFocused: boolean;
  options: any;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.tabItem, animStyle]}>
      <Pressable
        style={styles.tabPressable}
        onPressIn={() => { scale.value = withSpring(0.84, { damping: 12, stiffness: 400 }); }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 12, stiffness: 400 });
          onPress();
        }}
        hitSlop={8}
      >
        {options.tabBarIcon?.({
          focused: isFocused,
          color: isFocused ? colors.tabActive : colors.tabInactive,
          size: 23,
        })}
        <Text style={[styles.tabLabel, { color: isFocused ? colors.tabActive : colors.tabInactive }]}>
          {options.title}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function CreateButton() {
  const { present } = useAddDebt();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={styles.createContainer}>
      <Animated.View style={animStyle}>
        <Pressable
          style={styles.createButton}
          onPressIn={() => { scale.value = withSpring(0.88, { damping: 12, stiffness: 400 }); }}
          onPressOut={() => {
            scale.value = withSpring(1, { damping: 12, stiffness: 400 });
            present();
          }}
          hitSlop={8}
        >
          <MaterialIcons name="add" size={24} color="#fff" />
        </Pressable>
      </Animated.View>
      <Text style={styles.createLabel}>Create</Text>
    </View>
  );
}

export function LiquidTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const routes = state.routes;
  const mid = Math.floor(routes.length / 2);

  const renderTab = (route: typeof routes[0]) => {
    const index = routes.indexOf(route);
    const { options } = descriptors[route.key];
    const isFocused = state.index === index;
    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
    };
    return <TabItem key={route.key} isFocused={isFocused} options={options} onPress={onPress} />;
  };

  return (
    <View style={[styles.wrapper, { bottom: insets.bottom + 10 }]}>
      <BlurView intensity={72} tint="systemUltraThinMaterial" style={styles.surface}>
        <View style={styles.topBorder} />
        <View style={styles.tabRow}>
          {routes.slice(0, mid).map(renderTab)}
          <CreateButton />
          {routes.slice(mid).map(renderTab)}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 26,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 12,
  },
  surface: {
    borderRadius: 26,
    overflow: 'hidden',
  },
  topBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 10,
  },
  tabItem: { flex: 1 },
  tabPressable: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 4,
  },
  tabLabel: {
    ...type.caption2,
    fontWeight: '500',
  },
  createContainer: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 4,
  },
  createButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
    marginBottom: 4,
    shadowColor: colors.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  createLabel: {
    ...type.caption2,
    fontWeight: '600',
    color: colors.tint,
  },
});
