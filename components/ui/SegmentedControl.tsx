import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { radius, space, type, useColors, type ColorPalette } from '@/lib/platform';

interface SegmentedControlProps {
  options: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
}

function createStyles(palette: ColorPalette, dark: boolean) {
  return StyleSheet.create({
    container: {
      width: '80%',
      alignSelf: 'center',
    },
    track: {
      flexDirection: 'row',
      backgroundColor: palette.fillSecondary,
      borderRadius: radius.sm,
      padding: 2,
      minHeight: 32,
    },
    segment: {
      flex: 1,
      minHeight: 28,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.sm - 2,
      paddingHorizontal: space[2],
    },
    activeSegment: {
      backgroundColor: dark ? palette.surfaceRaised : palette.surface,
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

export function SegmentedControl({ options, selectedIndex, onChange }: SegmentedControlProps) {
  const palette = useColors();
  const scheme = useAppColorScheme();
  const styles = useMemo(() => createStyles(palette, scheme === 'dark'), [palette, scheme]);

  return (
    <View style={styles.container}>
      <View style={styles.track}>
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
