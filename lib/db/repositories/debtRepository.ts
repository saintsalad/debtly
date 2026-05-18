import type { Debt } from '@/features/debts/types';
import type { DebtlyDatabase } from '@/lib/db/client';
import {
  assembleDebts,
  debtToRow,
  paymentToRow,
} from '@/lib/db/mappers/debt';
import { debtPayments, debts } from '@/lib/db/schema';

export async function loadDebts(db: DebtlyDatabase): Promise<Debt[]> {
  const debtRows = await db.select().from(debts);
  const paymentRows = await db.select().from(debtPayments);
  return assembleDebts(debtRows, paymentRows);
}

export async function replaceDebts(db: DebtlyDatabase, items: Debt[]): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(debtPayments);
    await tx.delete(debts);
    if (items.length === 0) return;
    await tx.insert(debts).values(items.map(debtToRow));
    const paymentRows = items.flatMap((debt) =>
      (debt.payments ?? []).map((p) => paymentToRow(p, debt.id))
    );
    if (paymentRows.length > 0) {
      await tx.insert(debtPayments).values(paymentRows);
    }
  });
}
