import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { glassBorderStyle } from '@/lib/glassBorder';
import { radius, space, type, useColors, type ColorPalette } from '@/lib/platform';
import type { LucideIcon } from 'lucide-react-native';
import React, { useMemo } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

interface SegmentedControlProps {
  options: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  /** Fills parent width (e.g. toolbar row); default is centered 80% width. */
  variant?: 'default' | 'inline';
  /** Merged after base track styles (e.g. translucent track over scrolling content). */
  trackStyle?: StyleProp<ViewStyle>;
  /** Optional icon per segment; omit or `undefined` for text-only tabs (e.g. “All”). */
  icons?: Array<LucideIcon | undefined>;
  /** When segment is selected, sets label + icon color (fallback: semantic active label color). */
  selectedForegroundByIndex?: Array<string | undefined>;
}

const TRACK_PAD = 1;
const INNER_RADIUS = radius.md - TRACK_PAD;
const SEGMENT_ICON_SIZE = 15;

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
      ...(Platform.OS === 'ios' ? { overflow: 'visible' as const } : null),
    },
    segment: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: INNER_RADIUS,
    },
    activeSegment: {
      alignSelf: 'stretch',
      flex: 1,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: INNER_RADIUS,
      backgroundColor: dark ? palette.surfaceRaised : palette.surface,
      ...glassBorderStyle(dark ? 'dark' : 'light', 'secondary'),
      ...(Platform.OS === 'ios'
        ? {
            borderCurve: 'continuous' as const,
          }
        : dark
          ? {}
          : {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 0.5 },
              shadowOpacity: 0.12,
              shadowRadius: 1.5,
            }),
    },
    segmentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      maxWidth: '100%',
      paddingHorizontal: space[1],
    },
    labelBase: {
      ...type.footnote,
      fontWeight: '500',
      flexShrink: 1,
    },
    labelActive: {
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
  icons,
  selectedForegroundByIndex,
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
          const Icon = icons?.[index];
          const accent = selectedForegroundByIndex?.[index];
          const foreground = active ? accent ?? palette.label : palette.labelSecondary;

          const row = Icon ? (
            <View style={styles.segmentRow}>
              <Icon size={SEGMENT_ICON_SIZE} color={foreground} strokeWidth={2.25} />
              <Text
                style={[styles.labelBase, active ? styles.labelActive : null, { color: foreground }]}
                numberOfLines={1}
              >
                {option}
              </Text>
            </View>
          ) : (
            <Text
              style={[styles.labelBase, active ? styles.labelActive : null, { color: foreground }]}
              numberOfLines={1}
            >
              {option}
            </Text>
          );

          return (
            <Pressable
              key={`${option}-${index}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={styles.segment}
              onPress={() => onChange(index)}
            >
              {active ? <View style={styles.activeSegment}>{row}</View> : row}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
