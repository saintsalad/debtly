import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { RECEIPT_MUTED, RECEIPT_MONO } from '@/features/debts/receipt/receiptTheme';

export function ReceiptDottedRule() {
  if (Platform.OS === 'android') {
    return (
      <Text style={styles.fallback} numberOfLines={1}>
        ····································
      </Text>
    );
  }

  return <View style={styles.rule} />;
}

const styles = StyleSheet.create({
  rule: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    borderColor: RECEIPT_MUTED,
    marginVertical: 14,
  },
  fallback: {
    fontFamily: RECEIPT_MONO,
    fontSize: 10,
    color: RECEIPT_MUTED,
    letterSpacing: 1,
    marginVertical: 12,
    textAlign: 'center',
  },
});
