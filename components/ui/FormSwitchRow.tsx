import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { ListDivider } from '@/components/ui/ListDivider';
import { space, type, useColors } from '@/lib/platform';

interface FormSwitchRowProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  showSeparator?: boolean;
}

export function FormSwitchRow({
  label,
  description,
  value,
  onValueChange,
  showSeparator = false,
}: FormSwitchRowProps) {
  const palette = useColors();

  return (
    <>
      {showSeparator ? <ListDivider /> : null}
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text style={[styles.label, { color: palette.label }]}>{label}</Text>
          {description ? (
            <Text style={[styles.description, { color: palette.labelSecondary }]}>{description}</Text>
          ) : null}
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: palette.fill, true: palette.tintMuted }}
          thumbColor={palette.surface}
          ios_backgroundColor={palette.fill}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingVertical: space[4],
  },
  copy: {
    flex: 1,
    gap: space[1],
  },
  label: {
    ...type.body,
  },
  description: {
    ...type.footnote,
  },
});
