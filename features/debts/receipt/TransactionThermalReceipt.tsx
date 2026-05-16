import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Debt } from '@/features/debts/types';
import { ReceiptDottedRule } from '@/features/debts/receipt/ReceiptDottedRule';
import { ReceiptRow } from '@/features/debts/receipt/ReceiptRow';
import { ReceiptTearEdge } from '@/features/debts/receipt/ReceiptTearEdge';
import {
  RECEIPT_PAPER,
  RECEIPT_WIDTH,
  receiptType,
} from '@/features/debts/receipt/receiptTheme';
import { buildTransactionReceiptData } from '@/features/debts/receipt/transactionReceiptData';

interface TransactionThermalReceiptProps {
  debt: Debt;
  fmt: (amount: number) => string;
}

export function TransactionThermalReceipt({ debt, fmt }: TransactionThermalReceiptProps) {
  const data = useMemo(() => buildTransactionReceiptData(debt, fmt), [debt, fmt]);
  const hasPayments = data.paymentLines.length > 0;

  return (
    <View style={styles.wrapper}>
      <View style={styles.paper}>
        <Text style={styles.wordmark}>DEBTLY</Text>
        <Text style={styles.timestamp}>{data.printedAt}</Text>

        <View style={styles.spacerSm} />
        <Text style={styles.sectionTitle}>Transaction</Text>

        <View style={styles.referenceBox}>
          <Text style={styles.reference}>{data.referenceId}</Text>
        </View>

        <ReceiptDottedRule />

        {data.rows.map((row) => (
          <ReceiptRow key={row.label} row={row} />
        ))}

        {hasPayments ? (
          <>
            <ReceiptDottedRule />
            <Text style={styles.subsection}>Payments</Text>
            {data.paymentLines.map((row, index) => (
              <ReceiptRow key={`${row.label}-${index}`} row={row} />
            ))}
          </>
        ) : null}

        <View style={styles.spacerMd} />
        <Text style={styles.footer}>DEBTLY</Text>
      </View>
      <ReceiptTearEdge width={RECEIPT_WIDTH} color={RECEIPT_PAPER} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: RECEIPT_WIDTH,
    alignSelf: 'center',
  },
  paper: {
    width: RECEIPT_WIDTH,
    backgroundColor: RECEIPT_PAPER,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  wordmark: receiptType.wordmark,
  timestamp: receiptType.timestamp,
  sectionTitle: receiptType.sectionTitle,
  referenceBox: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#000000',
    borderRadius: 2,
  },
  reference: receiptType.reference,
  subsection: receiptType.subsection,
  footer: receiptType.footer,
  spacerSm: { height: 10 },
  spacerMd: { height: 14 },
});
