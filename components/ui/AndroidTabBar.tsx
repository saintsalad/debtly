import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Plus } from 'lucide-react-native';
import { Button, useThemeColor } from 'heroui-native';
import { useColors, type, type ColorPalette } from '@/lib/platform';
import { useAddDebt } from '@/lib/addDebtContext';

function TabItem({
  isFocused,
  options,
  onPress,
  palette,
}: {
  isFocused: boolean;
  options: any;
  onPress: () => void;
  palette: ColorPalette;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const labelColor = isFocused ? palette.tabActive : palette.tabInactive;

  return (
    <Animated.View style={[styles.tabItem, animStyle]}>
      <Pressable
        style={styles.tabPressable}
        onPressIn={() => { scale.value = withSpring(0.84, { damping: 12, stiffness: 400 }); }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 12, stiffness: 400 });
          onPress();
        }}
        android_ripple={{ color: palette.fill, borderless: true, radius: 36 }}
      >
        {options.tabBarIcon?.({
          focused: isFocused,
          color: labelColor,
          size: 23,
        })}
        <Text style={[styles.tabLabel, { color: labelColor }]}>
          {options.title}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function CreateButton({ palette }: { palette: ColorPalette }) {
  const { present } = useAddDebt();
  const accentForeground = useThemeColor('accent-foreground');

  return (
    <View style={styles.createContainer}>
      <Button
        isIconOnly
        size="lg"
        variant="primary"
        feedbackVariant="scale-ripple"
        animation={{ scale: { value: 0.97 } }}
        className="-mt-5 mb-1 self-center shadow-lg"
        onPress={present}
      >
        <Plus size={26} color={accentForeground} />
      </Button>
      <Text style={[styles.createLabel, { color: palette.tint }]}>
        Create
      </Text>
    </View>
  );
}

export function AndroidTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const palette = useColors();
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
    return (
      <TabItem
        key={route.key}
        isFocused={isFocused}
        options={options}
        onPress={onPress}
        palette={palette}
      />
    );
  };

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: palette.surface,
          borderTopColor: palette.opaqueSeparator,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <View style={styles.tabRow}>
        {routes.slice(0, mid).map(renderTab)}
        <CreateButton palette={palette} />
        {routes.slice(mid).map(renderTab)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: 6,
    paddingBottom: 8,
  },
  tabItem: {
    flex: 1,
    minWidth: 0,
  },
  tabPressable: {
    width: '100%',
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
    minWidth: 0,
    alignItems: 'center',
    paddingBottom: 4,
  },
  createLabel: {
    ...type.caption2,
    fontWeight: '600',
  },
});
