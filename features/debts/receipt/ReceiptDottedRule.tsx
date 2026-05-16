import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { RECEIPT_INK, RECEIPT_MONO } from '@/features/debts/receipt/receiptTheme';

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
    borderBottomWidth: 1,
    borderStyle: 'dotted',
    borderColor: RECEIPT_INK,
    marginVertical: 8,
    opacity: 0.35,
  },
  fallback: {
    fontFamily: RECEIPT_MONO,
    fontSize: 10,
    color: RECEIPT_INK,
    opacity: 0.35,
    letterSpacing: 1,
    marginVertical: 6,
    textAlign: 'center',
  },
});
