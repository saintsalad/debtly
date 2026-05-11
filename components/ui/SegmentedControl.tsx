import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, type, radius } from '@/lib/platform';

interface SegmentedControlProps {
  options: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
}

export function SegmentedControl({ options, selectedIndex, onChange }: SegmentedControlProps) {
  return (
    <View style={styles.track}>
      {options.map((opt, i) => {
        const active = selectedIndex === i;
        return (
          <Pressable
            key={opt}
            style={[styles.segment, active && styles.activeSegment]}
            onPress={() => onChange(i)}
          >
            <Text style={[styles.label, active && styles.activeLabel]}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.fill,
    borderRadius: radius.md,
    padding: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radius.md - 2,
  },
  activeSegment: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  label: {
    ...type.subheadline,
    fontWeight: '500',
    color: colors.labelSecondary,
  },
  activeLabel: {
    color: colors.label,
    fontWeight: '600',
  },
});
