import React from 'react';
import { Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Plus } from 'lucide-react-native';
import { useThemeColor } from 'heroui-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassButton } from '@/components/ui/GlassButton';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useAddDebt } from '@/lib/addDebtContext';
import { useGlassBorder } from '@/lib/glassBorder';
import { useFloatingBarShadow, useFloatingFabShadow } from '@/lib/glassSurface';
import { chrome, iosBlurScrim } from '@/lib/theme/tokens';
import { space, useColors, type ColorPalette } from '@/lib/platform';

/** Shared height for the tab pill and add button. */
const BAR_HEIGHT = 56;
const BAR_RADIUS = BAR_HEIGHT / 2;
const TAB_SLOT = BAR_HEIGHT;
const BAR_HORIZONTAL_PADDING = space[4];
const BAR_GAP = space[3];

/** Android tab bar stays dark in app light mode. */
function androidPillBackground() {
  return chrome.floatingTabBarAndroid;
}

function tabIconColor(
  isFocused: boolean,
  scheme: 'light' | 'dark',
  palette: ColorPalette
) {
  if (scheme === 'light') {
    return isFocused ? chrome.floatingTabIconActiveOnGlass : chrome.floatingTabIconInactiveOnGlass;
  }
  return isFocused ? palette.tabActive : palette.tabInactive;
}

function iosPillBlurScrim(scheme: 'light' | 'dark') {
  return iosBlurScrim[scheme];
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
        style={styles.tabPressable}
        onPressIn={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

function CreateButton({ elevation }: { elevation: ViewStyle }) {
  const { present } = useAddDebt();
  const accentForeground = useThemeColor('accent-foreground');

  const handlePresent = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    present();
  };

  return (
    <View style={[styles.fabSlot, Platform.OS === 'ios' && elevation]}>
      <GlassButton
        isIconOnly
        size="md"
        variant="primary"
        glassVariant="tint"
        feedbackVariant="scale-ripple"
        animation={{ scale: { value: 0.97 } }}
        style={[styles.fabButton, Platform.OS === 'android' && elevation]}
        onPress={handlePresent}
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

  return <View style={styles.tabRow}>{routes.map(renderTab)}</View>;
}

export function FloatingPillTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const palette = useColors();
  const insets = useSafeAreaInsets();
  const scheme = useAppColorScheme();
  const glassBorder = useGlassBorder('surface');
  const pillElevation = useFloatingBarShadow();
  const fabElevation = useFloatingFabShadow();
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

  const pillStyle = {
    height: BAR_HEIGHT,
    borderRadius: BAR_RADIUS,
    borderCurve: Platform.OS === 'ios' ? ('continuous' as const) : undefined,
  };

  const pillContent =
    Platform.OS === 'ios' ? (
      <BlurView
        intensity={blurIntensity}
        tint={blurTint}
        style={[styles.pill, pillStyle]}
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
      <View style={[styles.pill, styles.pillAndroid, pillStyle]}>{tabRow}</View>
    );

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          paddingBottom: Math.max(insets.bottom, space[2]) + space[2],
          paddingHorizontal: BAR_HORIZONTAL_PADDING,
          gap: BAR_GAP,
          minHeight: BAR_HEIGHT,
        },
      ]}
    >
      <View
        style={[
          styles.pillElevated,
          pillStyle,
          styles.pillShell,
          Platform.OS === 'ios' && pillElevation,
          Platform.OS === 'android' && [
            pillElevation,
            { backgroundColor: androidPillBackground() },
          ],
        ]}
      >
        <View
          style={[
            styles.pillClip,
            Platform.OS === 'android' && styles.pillClipAndroid,
            glassBorder,
            pillStyle,
          ]}
        >
          {pillContent}
        </View>
      </View>
      <CreateButton elevation={fabElevation} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pillShell: {
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  pillElevated: {
    backgroundColor: 'transparent',
  },
  pillClip: {
    overflow: 'hidden',
  },
  pillClipAndroid: {
    overflow: 'visible',
  },
  pill: {
    overflow: 'hidden',
    paddingHorizontal: space[1],
    justifyContent: 'center',
  },
  pillAndroid: {
    overflow: 'visible',
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: BAR_HEIGHT,
  },
  tabItem: {
    width: TAB_SLOT,
    height: TAB_SLOT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPressable: {
    width: TAB_SLOT,
    height: TAB_SLOT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabSlot: {
    width: BAR_HEIGHT,
    height: BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  fabButton: {
    width: BAR_HEIGHT,
    height: BAR_HEIGHT,
    borderRadius: BAR_RADIUS,
  },
});
