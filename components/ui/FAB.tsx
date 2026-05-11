import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface FABProps {
  onPress: () => void;
  bottom?: number;
}

export function FAB({ onPress, bottom = 100 }: FABProps) {
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  return (
    <Animated.View style={[styles.wrapper, { bottom }, animStyle]}>
      <AnimatedPressable
        style={styles.button}
        onPressIn={() => {
          scale.value = withSpring(0.9, { damping: 12 });
          rotate.value = withSpring(45, { damping: 10 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 12 });
          rotate.value = withSpring(0, { damping: 10 });
          onPress();
        }}
        hitSlop={8}
      >
        <Text style={styles.icon}>+</Text>
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    right: 20,
    borderRadius: 28,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '300',
    lineHeight: 32,
    includeFontPadding: false,
  },
});
