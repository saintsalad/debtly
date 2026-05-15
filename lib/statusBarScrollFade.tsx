import { useFocusEffect } from '@react-navigation/native';
import MaskedView from '@react-native-masked-view/masked-view';
import { BlurView, type BlurTint } from 'expo-blur';
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

import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useColors } from '@/lib/platform';

/**
 * Extra height below the status-bar inset so the strip covers the transition into content.
 */
const SCROLL_FADE_BELOW_INSET_PX = 44;

type StatusBarScrollFadeContextValue = {
  scrollY: SharedValue<number>;
};

const StatusBarScrollFadeContext = createContext<StatusBarScrollFadeContextValue | null>(null);

function StatusBarScrollFadeOverlayImpl({ scrollY }: { scrollY: SharedValue<number> }) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const palette = useColors();
  const colorScheme = useAppColorScheme();
  const totalH = Math.max(insets.top + SCROLL_FADE_BELOW_INSET_PX, 1);
  const stripStyle = useMemo(() => ({ width: windowWidth, height: totalH }), [windowWidth, totalH]);

  const { blurTint, blurIntensity, blurReductionFactor } = useMemo((): {
    blurTint: BlurTint;
    blurIntensity: number;
    blurReductionFactor?: number;
  } => {
    const dark = colorScheme === 'dark';
    if (Platform.OS === 'android') {
      return {
        blurTint: dark ? 'dark' : 'light',
        blurIntensity: dark ? 36 : 44,
        blurReductionFactor: dark ? 4.2 : 3.5,
      };
    }
    if (Platform.OS === 'ios') {
      return {
        blurTint: dark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight',
        blurIntensity: dark ? 64 : 54,
      };
    }
    return {
      blurTint: dark ? 'dark' : 'light',
      blurIntensity: dark ? 50 : 50,
    };
  }, [colorScheme]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 20], [0, 1], Extrapolation.CLAMP),
  }));

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
      {Platform.OS === 'web' ? (
        <LinearGradient
          colors={
            colorScheme === 'dark'
              ? ['rgba(0,0,0,0.72)', 'rgba(0,0,0,0)']
              : [`${palette.bg}CC`, 'transparent']
          }
          locations={[0.08, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={stripStyle}
        />
      ) : (
        <MaskedView style={stripStyle} maskElement={
          <LinearGradient
            colors={['#FFFFFF', '#FFFFFF', 'rgba(255,255,255,0)']}
            locations={[0, 0.4, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={stripStyle}
          />
        }>
          <BlurView
            intensity={blurIntensity}
            tint={blurTint}
            style={stripStyle}
            experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
            blurReductionFactor={Platform.OS === 'android' ? blurReductionFactor : undefined}
          />
        </MaskedView>
      )}
    </Animated.View>
  );
}

function StatusBarScrollFadeOverlay() {
  const ctx = useContext(StatusBarScrollFadeContext);
  if (!ctx) {
    return null;
  }
  return <StatusBarScrollFadeOverlayImpl scrollY={ctx.scrollY} />;
}

export function StatusBarScrollFadeProvider({ children }: { children: React.ReactNode }) {
  const scrollY = useSharedValue(0);
  const value = useMemo(() => ({ scrollY }), [scrollY]);

  return (
    <StatusBarScrollFadeContext.Provider value={value}>
      {children}
      <StatusBarScrollFadeOverlay />
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

  return { onScroll };
}
