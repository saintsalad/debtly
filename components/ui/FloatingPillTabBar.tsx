import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Plus } from 'lucide-react-native';
import { useThemeColor } from 'heroui-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassButton } from '@/components/ui/GlassButton';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useAddDebt } from '@/lib/addDebtContext';
import { useGlassBorder } from '@/lib/glassBorder';
import { useGlassCardShadow } from '@/lib/glassSurface';
import { space, useColors, type ColorPalette } from '@/lib/platform';

const PILL_RADIUS = 30;
const PILL_VERTICAL_PADDING = 6;
const PILL_VERTICAL_PADDING_ANDROID = 4;
const PILL_WIDTH_RATIO = 0.8;

const TAB_ICON_ACTIVE_LIGHT = '#FFFFFF';
const TAB_ICON_INACTIVE_LIGHT = 'rgba(255, 255, 255, 0.52)';

/** Android tab bar stays dark in app light mode. */
function androidPillBackground() {
  return 'rgba(28, 28, 30, 0.9)';
}

function tabIconColor(
  isFocused: boolean,
  scheme: 'light' | 'dark',
  palette: ColorPalette
) {
  if (scheme === 'light') {
    return isFocused ? TAB_ICON_ACTIVE_LIGHT : TAB_ICON_INACTIVE_LIGHT;
  }
  return isFocused ? palette.tabActive : palette.tabInactive;
}

function iosPillBlurScrim(scheme: 'light' | 'dark') {
  return scheme === 'dark' ? 'rgba(0, 0, 0, 0.38)' : 'rgba(0, 0, 0, 0.18)';
}

function TabItem({
  isFocused,
  options,
  onPress,
  palette,
  scheme,
}: {
  isFocused: boolean;
  options: BottomTabBarProps['descriptors'][string]['options'];
  onPress: () => void;
  palette: ColorPalette;
  scheme: 'light' | 'dark';
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const iconColor = tabIconColor(isFocused, scheme, palette);

  return (
    <Animated.View style={[styles.tabItem, animStyle]}>
      <Pressable
        style={[styles.tabPressable, Platform.OS === 'android' && styles.tabPressableAndroid]}
        onPressIn={() => {
          scale.value = withSpring(0.84, { damping: 12, stiffness: 400 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 12, stiffness: 400 });
          onPress();
        }}
        hitSlop={8}
        android_ripple={
          Platform.OS === 'android'
            ? {
                color: scheme === 'light' ? 'rgba(255, 255, 255, 0.14)' : palette.fill,
                borderless: true,
                radius: 32,
              }
            : undefined
        }
      >
        {options.tabBarIcon?.({
          focused: isFocused,
          color: iconColor,
          size: 23,
        })}
      </Pressable>
    </Animated.View>
  );
}

function CreateButton() {
  const { present } = useAddDebt();
  const accentForeground = useThemeColor('accent-foreground');

  return (
    <View style={styles.createContainer}>
      <GlassButton
        isIconOnly
        size="md"
        variant="primary"
        glassVariant="tint"
        feedbackVariant="scale-ripple"
        animation={{ scale: { value: 0.97 } }}
        className="self-center shadow-md"
        onPress={present}
      >
        <Plus size={22} color={accentForeground} />
      </GlassButton>
    </View>
  );
}

function TabRow({
  state,
  descriptors,
  navigation,
  palette,
  scheme,
}: Pick<BottomTabBarProps, 'state' | 'descriptors' | 'navigation'> & {
  palette: ColorPalette;
  scheme: 'light' | 'dark';
}) {
  const routes = state.routes;
  const mid = Math.floor(routes.length / 2);

  const renderTab = (route: (typeof routes)[0]) => {
    const index = routes.indexOf(route);
    const { options } = descriptors[route.key];
    const isFocused = state.index === index;
    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
    };

    return (
      <TabItem
        key={route.key}
        isFocused={isFocused}
        options={options}
        onPress={onPress}
        palette={palette}
        scheme={scheme}
      />
    );
  };

  return (
    <View style={styles.tabRow}>
      {routes.slice(0, mid).map(renderTab)}
      <CreateButton />
      {routes.slice(mid).map(renderTab)}
    </View>
  );
}

export function FloatingPillTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const palette = useColors();
  const insets = useSafeAreaInsets();
  const scheme = useAppColorScheme();
  const glassBorder = useGlassBorder('surface');
  const shadow = useGlassCardShadow();
  const pillVerticalPadding =
    Platform.OS === 'android' ? PILL_VERTICAL_PADDING_ANDROID : PILL_VERTICAL_PADDING;
  const blurTint = 'dark' as const;
  const blurIntensity = scheme === 'dark' ? 100 : 92;

  const tabRow = (
    <TabRow
      state={state}
      descriptors={descriptors}
      navigation={navigation}
      palette={palette}
      scheme={scheme}
    />
  );

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          paddingBottom: Math.max(insets.bottom, space[2]) + space[2],
        },
      ]}
    >
      <View
        style={[
          styles.pillShadow,
          shadow,
          glassBorder,
          {
            width: `${PILL_WIDTH_RATIO * 100}%`,
            borderRadius: PILL_RADIUS,
            borderCurve: Platform.OS === 'ios' ? 'continuous' : undefined,
          },
        ]}
      >
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={blurIntensity}
            tint={blurTint}
            style={[
              styles.pill,
              { borderRadius: PILL_RADIUS, paddingVertical: pillVerticalPadding },
            ]}
          >
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFillObject,
                { backgroundColor: iosPillBlurScrim(scheme) },
              ]}
            />
            {tabRow}
          </BlurView>
        ) : (
          <View
            style={[
              styles.pill,
              styles.pillAndroid,
              {
                borderRadius: PILL_RADIUS,
                paddingVertical: pillVerticalPadding,
                backgroundColor: androidPillBackground(),
              },
            ]}
          >
            {tabRow}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  pillShadow: {
    overflow: 'hidden',
  },
  pill: {
    overflow: 'hidden',
    paddingHorizontal: space[1],
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    minWidth: 0,
  },
  tabPressable: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space[2],
  },
  tabPressableAndroid: {
    paddingVertical: space[1],
  },
  createContainer: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
