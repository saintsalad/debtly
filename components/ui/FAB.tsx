import React from 'react';
import { Pressable, StyleSheet, Platform, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Plus } from 'lucide-react-native';
import { useGlassBorder } from '@/lib/glassBorder';
import { colors, radius } from '@/lib/platform';

interface FABProps {
  onPress: () => void;
  bottom?: number;
}

export function FAB({ onPress, bottom = 100 }: FABProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const glassBorder = useGlassBorder('tint');

  return (
    <Animated.View style={[styles.wrapper, { bottom }, animStyle]}>
      <Pressable
        style={({ pressed }) => [styles.button, glassBorder, pressed && styles.pressed]}
        onPressIn={() => { scale.value = withSpring(0.93, { damping: 14 }); }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14 });
          onPress();
        }}
        hitSlop={8}
        android_ripple={{ color: 'rgba(255,255,255,0.25)', radius: 28 }}
      >
        <Plus size={26} color="#fff" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    right: 20,
    borderRadius: 28,
    ...(Platform.OS === 'ios'
      ? { shadowColor: colors.tint, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 }
      : { elevation: 6 }),
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.9,
  },
});
