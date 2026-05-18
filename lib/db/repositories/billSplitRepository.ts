import type { BillSplit } from '@/features/bill-split/types';
import type { DebtlyDatabase } from '@/lib/db/client';
import { assembleBillSplits, participantToRow, splitToRow } from '@/lib/db/mappers/billSplit';
import { billSplitParticipants, billSplits } from '@/lib/db/schema';

export async function loadBillSplits(db: DebtlyDatabase): Promise<BillSplit[]> {
  const splitRows = await db.select().from(billSplits);
  const participantRows = await db.select().from(billSplitParticipants);
  return assembleBillSplits(splitRows, participantRows);
}

export async function replaceBillSplits(db: DebtlyDatabase, items: BillSplit[]): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(billSplitParticipants);
    await tx.delete(billSplits);
    if (items.length === 0) return;
    await tx.insert(billSplits).values(items.map(splitToRow));
    const participantRows = items.flatMap((split) =>
      split.participants.map((p) => participantToRow(p, split.id))
    );
    if (participantRows.length > 0) {
      await tx.insert(billSplitParticipants).values(participantRows);
    }
  });
}
