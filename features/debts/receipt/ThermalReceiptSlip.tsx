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
import type { ReceiptSection, TransactionReceiptData } from '@/features/debts/receipt/transactionReceiptData';
import { Receipt } from 'lucide-react-native';
import React, { Fragment, useCallback, useId, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Mask, Rect } from 'react-native-svg';

/** Side “perforation” holes; radius matches historical 12px diameter notches. */
const SIDE_NOTCH_R = 6;
const SIDE_NOTCH_Y_RATIO = 0.45;

function ReceiptPaperFill({
  width,
  height,
  maskId,
}: {
  width: number;
  height: number;
  maskId: string;
}) {
  const cy = SIDE_NOTCH_Y_RATIO * height;
  return (
    <Svg
      width={width}
      height={height}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <Defs>
        <Mask id={maskId} maskUnits="userSpaceOnUse" x={0} y={0} width={width} height={height}>
          <Rect width={width} height={height} fill="#FFFFFF" />
          <Circle cx={0} cy={cy} r={SIDE_NOTCH_R} fill="#000000" />
          <Circle cx={width} cy={cy} r={SIDE_NOTCH_R} fill="#000000" />
        </Mask>
      </Defs>
      <Rect width={width} height={height} fill={RECEIPT_PAPER} mask={`url(#${maskId})`} />
    </Svg>
  );
}

export interface ThermalReceiptSlipProps {
  data: TransactionReceiptData;
  photoUri?: string | null;
}

function normalizeSections(data: TransactionReceiptData): ReceiptSection[] {
  if (data.sections && data.sections.length > 0) {
    return data.sections.filter((s) => s.rows.length > 0);
  }
  return [{ title: '', rows: data.rows }];
}

export function ThermalReceiptSlip({ data, photoUri }: ThermalReceiptSlipProps) {
  const sectionBlocks = useMemo(() => normalizeSections(data), [data]);
  const hasPayments = data.paymentLines.length > 0;
  const hasPhoto = Boolean(photoUri);
  const { header } = data;
  const footerTagline = useMemo(() => getReceiptFooterTagline(), []);

  const maskUid = useId();
  const paperMaskId = useMemo(
    () => `receiptPaperMask_${maskUid.replace(/[^a-zA-Z0-9_-]/g, '')}`,
    [maskUid]
  );
  const [paperHeight, setPaperHeight] = useState(0);

  const onPaperLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0) setPaperHeight(h);
  }, []);

  const tearEdge = <ReceiptTearEdge width={RECEIPT_WIDTH} color={RECEIPT_PAPER} />;

  return (
    <View style={styles.wrapper}>
      <View style={styles.edgeStack}>
        <View style={[styles.paper, paperHeight > 0 && styles.paperNoFill]} onLayout={onPaperLayout}>
          {paperHeight > 0 ? (
            <ReceiptPaperFill width={RECEIPT_WIDTH} height={paperHeight} maskId={paperMaskId} />
          ) : null}
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

            {sectionBlocks.map((sec, si) => (
              <Fragment key={`sec-${si}`}>
                {si > 0 ? <ReceiptDottedRule /> : null}
                <View style={[styles.contentPad, styles.stack]}>
                  {sec.title.trim().length > 0 ? (
                    <Text style={styles.sectionHeading}>{sec.title}</Text>
                  ) : null}
                  {sec.rows.map((row, index) => (
                    <ReceiptRow key={`row-${si}-${index}-${row.label}`} row={row} />
                  ))}
                </View>
              </Fragment>
            ))}

            {hasPayments ? (
              <>
                <ReceiptDottedRule />
                <View style={[styles.contentPad, styles.stack]}>
                  <Text style={styles.subsection}>Payments</Text>
                  {data.paymentLines.map((row, index) => (
                    <ReceiptRow key={`pay-${index}-${row.label}`} row={row} />
                  ))}
                </View>
              </>
            ) : null}

            <ReceiptDottedRule />

            <View style={[styles.contentPad, styles.stack]}>
              {!data.omitFooterAmountRow ? (
                <ReceiptRow row={{ label: 'Amount', value: header.amount }} />
              ) : null}
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
    ...(Platform.OS === 'android' ? { marginBottom: -RECEIPT_TEAR_PAPER_OVERLAP } : null),
  },
  paperNoFill: {
    backgroundColor: 'transparent',
  },
  body: {
    paddingTop: 18,
    paddingBottom: 18,
    zIndex: 1,
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
  sectionHeading: {
    ...receiptType.subsection,
    marginTop: 2,
    marginBottom: 4,
    textAlign: 'left',
    letterSpacing: 1,
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
