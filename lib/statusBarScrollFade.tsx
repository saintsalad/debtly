import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Platform, useWindowDimensions, type ViewStyle } from 'react-native';
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
const SCROLL_FADE_BELOW_INSET_PX = 72;

/** Global fade sits above scroll content but below screen headers (z-index 2). */
export const SCROLL_FADE_Z_INDEX = 1;

/** Apply to page / modal header rows so they paint above the scroll fade. */
export const SCREEN_HEADER_Z_INDEX = 2;

/** iOS uses zIndex; Android needs matching elevation for sibling draw order above ScrollView. */
export const scrollFadeLayerStyle: ViewStyle = Platform.select({
  ios: { zIndex: SCROLL_FADE_Z_INDEX },
  android: { zIndex: SCROLL_FADE_Z_INDEX, elevation: SCROLL_FADE_Z_INDEX },
  default: { zIndex: SCROLL_FADE_Z_INDEX },
}) ?? { zIndex: SCROLL_FADE_Z_INDEX };

export const screenHeaderLayerStyle: ViewStyle = Platform.select({
  ios: { zIndex: SCREEN_HEADER_Z_INDEX },
  android: { zIndex: SCREEN_HEADER_Z_INDEX, elevation: SCREEN_HEADER_Z_INDEX },
  default: { zIndex: SCREEN_HEADER_Z_INDEX },
}) ?? { zIndex: SCREEN_HEADER_Z_INDEX };

/** Keep scroll surfaces below fade/header overlays on Android. */
export const scrollContentLayerStyle: ViewStyle = Platform.select({
  android: { zIndex: 0, elevation: 0 },
  default: {},
}) ?? {};

type StatusBarScrollFadeContextValue = {
  scrollY: SharedValue<number>;
  setScreenHostedOverlay: (active: boolean) => void;
};

const StatusBarScrollFadeContext = createContext<StatusBarScrollFadeContextValue | null>(null);

export type StatusBarScrollFadeHost = 'global' | 'screen';

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

  return (
    <Animated.View
      pointerEvents="none"
      collapsable={false}
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: totalH,
          overflow: 'hidden',
          backgroundColor: 'transparent',
        },
        scrollFadeLayerStyle,
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
  const [screenHostedOverlay, setScreenHostedOverlay] = useState(false);
  const value = useMemo(
    () => ({ scrollY, setScreenHostedOverlay }),
    [scrollY]
  );

  return (
    <StatusBarScrollFadeContext.Provider value={value}>
      {children}
      {!screenHostedOverlay ? <StatusBarScrollFadeOverlay scrollY={scrollY} /> : null}
    </StatusBarScrollFadeContext.Provider>
  );
}

/**
 * Screen-local fade strip — place as a sibling above the scroll view and below the header
 * when using `useStatusBarScrollFade({ overlayHost: 'screen' })`.
 */
export function StatusBarScrollFadeStrip() {
  const ctx = useContext(StatusBarScrollFadeContext);
  if (!ctx) {
    throw new Error('StatusBarScrollFadeStrip must be used within StatusBarScrollFadeProvider');
  }

  return <StatusBarScrollFadeOverlay scrollY={ctx.scrollY} />;
}

type UseStatusBarScrollFadeOptions = {
  /**
   * `global` (default): fade renders at the app root.
   * `screen`: fade renders via `StatusBarScrollFadeStrip` in the screen tree so headers can sit above it.
   */
  overlayHost?: StatusBarScrollFadeHost;
};

/**
 * Wire the active screen’s vertical scroll to the status-bar fade overlay.
 * Call from each screen that scrolls; leaving the screen resets scroll offset for the fade.
 */
export function useStatusBarScrollFade(options?: UseStatusBarScrollFadeOptions) {
  const overlayHost = options?.overlayHost ?? 'global';
  const ctx = useContext(StatusBarScrollFadeContext);
  if (!ctx) {
    throw new Error('useStatusBarScrollFade must be used within StatusBarScrollFadeProvider');
  }
  const { scrollY, setScreenHostedOverlay } = ctx;

  useFocusEffect(
    useCallback(() => {
      if (overlayHost === 'screen') {
        setScreenHostedOverlay(true);
      }
      return () => {
        if (overlayHost === 'screen') {
          setScreenHostedOverlay(false);
        }
        scrollY.value = 0;
      };
    }, [overlayHost, scrollY, setScreenHostedOverlay])
  );

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  return { onScroll, scrollY };
}
