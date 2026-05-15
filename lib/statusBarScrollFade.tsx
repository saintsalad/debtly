import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/lib/platform';

/** Extra height below the status-bar inset so the strip eases into content. */
const SCROLL_FADE_BELOW_INSET_PX = 44;

type StatusBarScrollFadeContextValue = {
  scrollY: SharedValue<number>;
};

const StatusBarScrollFadeContext = createContext<StatusBarScrollFadeContextValue | null>(null);

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) {
    return hex;
  }
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function StatusBarScrollFadeOverlay({ scrollY }: { scrollY: SharedValue<number> }) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const palette = useColors();
  const totalH = Math.max(insets.top + SCROLL_FADE_BELOW_INSET_PX, 1);
  const stripStyle = useMemo(() => ({ width: windowWidth, height: totalH }), [windowWidth, totalH]);

  const gradientColors = useMemo(
    (): [string, string, string, string] => [
      palette.bg,
      hexToRgba(palette.bg, 0.78),
      hexToRgba(palette.bg, 0.38),
      hexToRgba(palette.bg, 0),
    ],
    [palette.bg]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 20], [0, 1], Extrapolation.CLAMP),
  }));

  if (Platform.OS === 'web') {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: totalH,
          overflow: 'hidden',
          zIndex: 9999,
          backgroundColor: 'transparent',
        },
        animatedStyle,
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        locations={[0, 0.32, 0.68, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={stripStyle}
      />
    </Animated.View>
  );
}

export function StatusBarScrollFadeProvider({ children }: { children: React.ReactNode }) {
  const scrollY = useSharedValue(0);
  const value = useMemo(() => ({ scrollY }), [scrollY]);

  return (
    <StatusBarScrollFadeContext.Provider value={value}>
      {children}
      <StatusBarScrollFadeOverlay scrollY={scrollY} />
    </StatusBarScrollFadeContext.Provider>
  );
}

/**
 * Wire the active screen’s vertical scroll to the global status-bar fade overlay.
 * Call from each screen that scrolls; leaving the screen resets scroll offset for the fade.
 */
export function useStatusBarScrollFade() {
  const ctx = useContext(StatusBarScrollFadeContext);
  if (!ctx) {
    throw new Error('useStatusBarScrollFade must be used within StatusBarScrollFadeProvider');
  }
  const { scrollY } = ctx;

  useFocusEffect(
    useCallback(() => {
      return () => {
        scrollY.value = 0;
      };
    }, [scrollY])
  );

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  return { onScroll, scrollY };
}
