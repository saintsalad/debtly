import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { colors, type } from '@/lib/platform';

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
        android_ripple={{ color: 'rgba(0,0,0,0.08)', borderless: true, radius: 32 }}
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

export function LiquidTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const rows = (
    <View style={styles.tabRow}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return <TabItem key={route.key} isFocused={isFocused} options={options} onPress={onPress} />;
      })}
    </View>
  );

  return (
    <View style={[styles.wrapper, { bottom: insets.bottom + 10 }]}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={72} tint="systemUltraThinMaterial" style={styles.surface}>
          <View style={styles.border} />
          {rows}
        </BlurView>
      ) : (
        <View style={[styles.surface, styles.androidSurface]}>
          {rows}
        </View>
      )}
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
  androidSurface: {
    backgroundColor: 'rgba(255,255,255,0.97)',
  },
  border: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 10,
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
});
