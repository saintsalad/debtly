import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.tabItem, animStyle]}>
      <AnimatedPressable
        style={styles.tabPressable}
        onPressIn={() => {
          scale.value = withSpring(0.85, { damping: 10 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 10 });
          onPress();
        }}
        hitSlop={6}
      >
        {options.tabBarIcon?.({
          focused: isFocused,
          color: isFocused ? '#007AFF' : '#8E8E93',
          size: 24,
        })}
        <Text style={[styles.tabLabel, { color: isFocused ? '#007AFF' : '#8E8E93' }]}>
          {options.title}
        </Text>
      </AnimatedPressable>
    </Animated.View>
  );
}

export function LiquidTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const content = (
    <View style={styles.tabRow}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TabItem
            key={route.key}
            isFocused={isFocused}
            options={options}
            onPress={onPress}
          />
        );
      })}
    </View>
  );

  return (
    <View style={[styles.wrapper, { bottom: insets.bottom + 12 }]}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={80} tint="systemChromeMaterial" style={styles.blur}>
          {content}
        </BlurView>
      ) : (
        <View style={[styles.blur, styles.androidSurface]}>{content}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 16,
  },
  blur: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  androidSurface: {
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tabItem: { flex: 1 },
  tabPressable: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 4,
  },
  tabLabel: { fontSize: 10, fontWeight: '600' },
});
