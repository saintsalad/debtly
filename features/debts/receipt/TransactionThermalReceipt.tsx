import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { Debt } from '@/features/debts/types';
import { ReceiptDottedRule } from '@/features/debts/receipt/ReceiptDottedRule';
import { ReceiptRow } from '@/features/debts/receipt/ReceiptRow';
import { ReceiptTearEdge } from '@/features/debts/receipt/ReceiptTearEdge';
import {
  RECEIPT_SCRIM,
  RECEIPT_PAPER,
  RECEIPT_WIDTH,
  receiptType,
} from '@/features/debts/receipt/receiptTheme';
import { buildTransactionReceiptData } from '@/features/debts/receipt/transactionReceiptData';

interface TransactionThermalReceiptProps {
  debt: Debt;
  fmt: (amount: number) => string;
  backdropColor?: string;
  photoUri?: string | null;
}

export function TransactionThermalReceipt({
  debt,
  fmt,
  backdropColor = RECEIPT_SCRIM,
  photoUri,
}: TransactionThermalReceiptProps) {
  const data = useMemo(() => buildTransactionReceiptData(debt, fmt), [debt, fmt]);
  const hasPayments = data.paymentLines.length > 0;

  return (
    <View style={styles.wrapper}>
      <View style={styles.paper}>
        <View style={[styles.sideNotchLeft, { backgroundColor: backdropColor }]} />
        <View style={[styles.sideNotchRight, { backgroundColor: backdropColor }]} />

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>store 014</Text>
          <Text style={styles.metaText}>lane 03</Text>
        </View>

        <Text style={styles.wordmark}>DEBTLY</Text>
        <Text style={styles.timestamp}>{data.printedAt}</Text>

        <View style={styles.spacerSm} />
        <Text style={styles.sectionTitle}>Transaction</Text>
        <Text style={styles.sectionSubline}>share-friendly thermal ticket</Text>

        <Text style={styles.referenceLabel}>Reference Token</Text>
        <View style={styles.referenceBox}>
          <Text style={styles.reference}>{data.referenceId}</Text>
        </View>
        <View style={styles.stamp}>
          <Text style={styles.stampText}>CERTIFIED</Text>
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

        {photoUri ? (
          <>
            <ReceiptDottedRule />
            <Text style={styles.subsection}>Receipt Photo</Text>
            <View style={styles.photoFrame}>
              <Image source={{ uri: photoUri }} contentFit="cover" style={styles.photo} />
            </View>
          </>
        ) : null}

        <View style={styles.spacerMd} />
        <Text style={styles.footer}>DEBTLY</Text>
        <Text style={styles.footerTagline}>transparent money talks</Text>
      </View>
      <ReceiptTearEdge width={RECEIPT_WIDTH} color={RECEIPT_PAPER} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: RECEIPT_WIDTH,
    alignSelf: 'center',
    boxShadow: '0 24px 30px rgba(0, 0, 0, 0.14)',
  },
  paper: {
    width: RECEIPT_WIDTH,
    backgroundColor: RECEIPT_PAPER,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    borderRadius: 4,
    overflow: 'hidden',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metaText: receiptType.miniMeta,
  wordmark: receiptType.wordmark,
  timestamp: receiptType.timestamp,
  sectionTitle: receiptType.sectionTitle,
  sectionSubline: {
    ...receiptType.sectionSubline,
    marginTop: 2,
  },
  referenceLabel: {
    ...receiptType.miniMeta,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  referenceBox: {
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
  footerTagline: {
    ...receiptType.footerTagline,
    marginTop: 2,
  },
  photoFrame: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#000000',
    borderStyle: 'dashed',
    padding: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: 140,
    borderRadius: 1,
    backgroundColor: '#D8D8D8',
  },
  stamp: {
    position: 'absolute',
    right: 18,
    top: 84,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 999,
    transform: [{ rotate: '-8deg' }],
    paddingVertical: 2,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
  },
  stampText: {
    fontFamily: receiptType.rowLabel.fontFamily,
    fontSize: 9,
    letterSpacing: 1.2,
    color: '#000000',
  },
  sideNotchLeft: {
    position: 'absolute',
    left: -6,
    top: '45%',
    width: 12,
    height: 12,
    borderRadius: 999,
    zIndex: 2,
  },
  sideNotchRight: {
    position: 'absolute',
    right: -6,
    top: '45%',
    width: 12,
    height: 12,
    borderRadius: 999,
    zIndex: 2,
  },
  spacerSm: { height: 10 },
  spacerMd: { height: 14 },
});
