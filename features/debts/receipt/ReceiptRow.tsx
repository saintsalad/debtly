import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ReceiptRow as ReceiptRowData } from '@/features/debts/receipt/transactionReceiptData';
import { receiptType } from '@/features/debts/receipt/receiptTheme';

interface ReceiptRowProps {
  row: ReceiptRowData;
}

export function ReceiptRow({ row }: ReceiptRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label} numberOfLines={5}>
        {row.label}
      </Text>
      <Text style={styles.value} numberOfLines={3}>
        {row.value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  label: receiptType.rowLabel,
  value: receiptType.rowValue,
});
