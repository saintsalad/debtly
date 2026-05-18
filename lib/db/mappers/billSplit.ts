import type { BillSplit, BillSplitParticipant } from '@/features/bill-split/types';
import type { billSplitParticipants, billSplits } from '@/lib/db/schema';

export type BillSplitRow = typeof billSplits.$inferSelect;
export type BillSplitParticipantRow = typeof billSplitParticipants.$inferSelect;

export function splitToRow(split: BillSplit): BillSplitRow {
  return {
    id: split.id,
    title: split.title,
    total: split.total,
    createdAt: split.createdAt,
    updatedAt: split.updatedAt,
  };
}

export function participantToRow(
  participant: BillSplitParticipant,
  billSplitId: string
): BillSplitParticipantRow {
  return {
    id: participant.id,
    billSplitId,
    name: participant.name,
    amount: participant.amount,
    paid: participant.paid,
  };
}

export function rowToSplit(row: BillSplitRow, participants: BillSplitParticipant[]): BillSplit {
  return {
    id: row.id,
    title: row.title,
    total: row.total,
    participants,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function rowToParticipant(row: BillSplitParticipantRow): BillSplitParticipant {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    paid: row.paid,
  };
}

export function assembleBillSplits(
  splitRows: BillSplitRow[],
  participantRows: BillSplitParticipantRow[]
): BillSplit[] {
  const bySplit = new Map<string, BillSplitParticipant[]>();
  for (const p of participantRows) {
    const list = bySplit.get(p.billSplitId) ?? [];
    list.push(rowToParticipant(p));
    bySplit.set(p.billSplitId, list);
  }
  return splitRows.map((row) => rowToSplit(row, bySplit.get(row.id) ?? []));
}
