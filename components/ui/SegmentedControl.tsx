import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

interface SegmentedControlProps {
  options: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
}

export function SegmentedControl({ options, selectedIndex, onChange }: SegmentedControlProps) {
  return (
    <View style={styles.container}>
      {options.map((opt, i) => (
        <Pressable
          key={opt}
          style={[styles.segment, selectedIndex === i && styles.active]}
          onPress={() => onChange(i)}
        >
          <Text style={[styles.label, selectedIndex === i && styles.activeLabel]}>{opt}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#EFEFF4',
    borderRadius: 12,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 10,
  },
  active: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  label: { fontSize: 13, fontWeight: '500', color: '#9CA3AF' },
  activeLabel: { color: '#111827', fontWeight: '600' },
});
