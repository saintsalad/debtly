import React, { useMemo } from 'react';
import { PrintedReceiptShareScreen } from '@/features/debts/receipt/PrintedReceiptShareScreen';
import { buildTransactionReceiptData } from '@/features/debts/receipt/transactionReceiptData';
import type { Debt } from '@/features/debts/types';

interface TransactionReceiptScreenProps {
  debt: Debt;
  fmt: (amount: number) => string;
  onClose: () => void;
}

export function TransactionReceiptScreen({ debt, fmt, onClose }: TransactionReceiptScreenProps) {
  const receiptData = useMemo(() => buildTransactionReceiptData(debt, fmt), [debt, fmt]);

  return (
    <PrintedReceiptShareScreen receiptData={receiptData} tiltSeed={debt.id} onClose={onClose} />
  );
}
