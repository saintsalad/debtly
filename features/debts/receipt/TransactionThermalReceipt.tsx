import { getReceiptFooterTagline } from '@/features/debts/receipt/receiptDeviceLabel';
import { ReceiptDottedRule } from '@/features/debts/receipt/ReceiptDottedRule';
import { ReceiptImageContainer } from '@/features/debts/receipt/ReceiptImageContainer';
import { ReceiptRow } from '@/features/debts/receipt/ReceiptRow';
import {
  RECEIPT_TEAR_PAPER_OVERLAP,
  ReceiptTearEdge,
} from '@/features/debts/receipt/ReceiptTearEdge';
import {
  RECEIPT_CONTENT_GAP,
  RECEIPT_INK,
  RECEIPT_PAD_H,
  RECEIPT_PAPER,
  RECEIPT_WIDTH,
  receiptType,
} from '@/features/debts/receipt/receiptTheme';
import { buildTransactionReceiptData } from '@/features/debts/receipt/transactionReceiptData';
import type { Debt } from '@/features/debts/types';
import { Receipt } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

interface TransactionThermalReceiptProps {
  debt: Debt;
  fmt: (amount: number) => string;
  photoUri?: string | null;
}

export function TransactionThermalReceipt({
  debt,
  fmt,
  photoUri,
}: TransactionThermalReceiptProps) {
  const data = useMemo(() => buildTransactionReceiptData(debt, fmt), [debt, fmt]);
  const hasPayments = data.paymentLines.length > 0;
  const hasPhoto = Boolean(photoUri);
  const { header } = data;
  const footerTagline = useMemo(() => getReceiptFooterTagline(), []);

  const tearEdge = (
    <ReceiptTearEdge width={RECEIPT_WIDTH} color={RECEIPT_PAPER} />
  );

  return (
    <View style={styles.wrapper}>
      <View style={styles.edgeStack}>
        <View style={styles.paper}>
          <View style={styles.body}>
            <View style={styles.contentPad}>
              <View style={styles.topBar}>
                <Receipt size={15} color={RECEIPT_INK} strokeWidth={2.5} />
                <Text style={styles.headerLabel}>Debtly Receipt</Text>
              </View>
            </View>

            <ReceiptDottedRule />

            <View style={[styles.contentPad, styles.stack]}>
              <View style={styles.receiptHeaderRow}>
                <Text style={styles.receiptHeaderTitle} numberOfLines={2}>
                  {header.title}
                </Text>
                <Text style={styles.receiptHeaderDate}>{header.date}</Text>
              </View>
              <ReceiptRow row={{ label: 'Receipt Id', value: data.referenceId }} />
              {hasPhoto ? <ReceiptImageContainer uri={photoUri!} /> : null}
            </View>

            <ReceiptDottedRule />

            <View style={[styles.contentPad, styles.stack]}>
              {data.rows.map((row) => (
                <ReceiptRow key={row.label} row={row} />
              ))}
            </View>

            {hasPayments ? (
              <>
                <ReceiptDottedRule />
                <View style={[styles.contentPad, styles.stack]}>
                  <Text style={styles.subsection}>Payments</Text>
                  {data.paymentLines.map((row, index) => (
                    <ReceiptRow key={`${row.label}-${index}`} row={row} />
                  ))}
                </View>
              </>
            ) : null}

            <ReceiptDottedRule />

            <View style={[styles.contentPad, styles.stack]}>
              <ReceiptRow row={{ label: 'Amount', value: header.amount }} />
              <View style={styles.footer}>
                <Text style={styles.footerTagline}>{footerTagline}</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.tearSlot}>{tearEdge}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: RECEIPT_WIDTH,
    alignSelf: 'center',
    alignItems: 'stretch',
  },
  edgeStack: {
    width: RECEIPT_WIDTH,
    position: 'relative',
  },
  tearSlot: {
    zIndex: 0,
  },
  paper: {
    width: RECEIPT_WIDTH,
    backgroundColor: RECEIPT_PAPER,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    overflow: 'hidden',
    zIndex: 1,
    ...(Platform.OS === 'android'
      ? { marginBottom: -RECEIPT_TEAR_PAPER_OVERLAP }
      : null),
  },
  body: {
    paddingTop: 18,
    paddingBottom: 18,
  },
  contentPad: {
    paddingHorizontal: RECEIPT_PAD_H,
  },
  stack: {
    gap: RECEIPT_CONTENT_GAP,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLabel: receiptType.headerLabel,
  receiptHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  receiptHeaderTitle: receiptType.heroTitle,
  receiptHeaderDate: {
    ...receiptType.heroTitle,
    textAlign: 'right',
    flexShrink: 0,
  },
  subsection: {
    ...receiptType.subsection,
    marginTop: 0,
    marginBottom: 0,
  },
  footer: {
    alignItems: 'center',
    marginTop: 30,
    paddingTop: 4,
  },
  footerTagline: receiptType.footerTagline,
});
