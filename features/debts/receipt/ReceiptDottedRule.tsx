import React from 'react';
import { StyleSheet, Text } from 'react-native';
import {
  RECEIPT_MUTED,
  RECEIPT_MONO,
  RECEIPT_PAD_H,
  RECEIPT_RULE_GAP,
} from '@/features/debts/receipt/receiptTheme';

const DOT_LINE = '·'.repeat(80);

/** Dotted cut line aligned with receipt content inset (RN dashed borders fail on iOS). */
export function ReceiptDottedRule() {
  return (
    <Text style={styles.rule} numberOfLines={1} ellipsizeMode="clip">
      {DOT_LINE}
    </Text>
  );
}

const styles = StyleSheet.create({
  rule: {
    alignSelf: 'stretch',
    marginVertical: RECEIPT_RULE_GAP,
    paddingHorizontal: RECEIPT_PAD_H,
    fontFamily: RECEIPT_MONO,
    fontSize: 10,
    color: RECEIPT_MUTED,
    letterSpacing: 1,
    textAlign: 'center',
  },
});
