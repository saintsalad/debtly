import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useColors } from '@/lib/platform';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

const GRADIENT_ID = 'screenBlueGradient';

/** Dark : blue stop ratio for tab screen backgrounds (60% dark, 40% blue). */
const DARK_STOP = '60%';
const SCREEN_BLUE = '#0E1F38';
const SCREEN_DARK = '#070F18';

/** Full-bleed dark blue screen background; light mode uses flat `palette.bg`. */
export function ScreenBlueGradient() {
  const colorScheme = useAppColorScheme();
  const palette = useColors();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const bleedTop = insets.top;
  const bleedHeight = windowHeight + bleedTop;

  if (colorScheme !== 'dark') {
    return (
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { top: -bleedTop, backgroundColor: palette.bg }]}
      />
    );
  }

  return (
    <Svg
      pointerEvents="none"
      width={windowWidth}
      height={bleedHeight}
      style={{ position: 'absolute', left: 0, right: 0, top: -bleedTop }}
    >
      <Defs>
        <LinearGradient id={GRADIENT_ID} x1="0%" y1="0%" x2="92%" y2="100%">
          <Stop offset="0%" stopColor={palette.bg} />
          <Stop offset={DARK_STOP} stopColor={SCREEN_DARK} />
          <Stop offset="100%" stopColor={SCREEN_BLUE} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width={windowWidth} height={bleedHeight} fill={`url(#${GRADIENT_ID})`} />
    </Svg>
  );
}
