import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { glassBorderStyle } from '@/lib/glassBorder';
import { radius, space, type, useColors, type ColorPalette } from '@/lib/platform';

interface SegmentedControlProps {
  options: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  /** Fills parent width (e.g. toolbar row); default is centered 80% width. */
  variant?: 'default' | 'inline';
  /** Merged after base track styles (e.g. translucent track over scrolling content). */
  trackStyle?: StyleProp<ViewStyle>;
}

const TRACK_PAD = 2;
const INNER_RADIUS = radius.md - TRACK_PAD;

function createStyles(palette: ColorPalette, dark: boolean, variant: 'default' | 'inline') {
  return StyleSheet.create({
    container:
      variant === 'inline'
        ? { alignSelf: 'stretch', width: '100%' }
        : { width: '80%', alignSelf: 'center' },
    track: {
      flexDirection: 'row',
      backgroundColor: palette.fillSecondary,
      borderRadius: radius.md,
      padding: TRACK_PAD,
      minHeight: 36,
      ...glassBorderStyle(dark ? 'dark' : 'light', 'surface'),
    },
    segment: {
      flex: 1,
      minHeight: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: INNER_RADIUS,
      paddingHorizontal: space[2],
    },
    activeSegment: {
      backgroundColor: dark ? palette.surfaceRaised : palette.surface,
      ...glassBorderStyle(dark ? 'dark' : 'light', 'secondary'),
      ...(dark
        ? {}
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 0.5 },
            shadowOpacity: 0.12,
            shadowRadius: 1.5,
          }),
    },
    label: {
      ...type.footnote,
      fontWeight: '500',
      color: palette.labelSecondary,
    },
    activeLabel: {
      color: palette.label,
      fontWeight: '600',
    },
  });
}

export function SegmentedControl({
  options,
  selectedIndex,
  onChange,
  variant = 'default',
  trackStyle,
}: SegmentedControlProps) {
  const palette = useColors();
  const scheme = useAppColorScheme();
  const styles = useMemo(
    () => createStyles(palette, scheme === 'dark', variant),
    [palette, scheme, variant]
  );

  return (
    <View style={styles.container}>
      <View style={[styles.track, trackStyle]}>
        {options.map((option, index) => {
          const active = selectedIndex === index;

          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.segment, active && styles.activeSegment]}
              onPress={() => onChange(index)}
            >
              <Text
                style={[styles.label, active && styles.activeLabel]}
                numberOfLines={1}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
