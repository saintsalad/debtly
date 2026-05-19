import type { DebtlyDatabase } from '@/lib/db/client';
import {
  DEFAULT_PROFILE,
  profileToRow,
  rowToProfile,
  type ProfileData,
} from '@/lib/db/mappers/profile';
import { profileSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function loadProfile(db: DebtlyDatabase): Promise<ProfileData> {
  const rows = await db.select().from(profileSettings).where(eq(profileSettings.id, 1));
  return rowToProfile(rows[0]);
}

export async function replaceProfile(db: DebtlyDatabase, data: ProfileData): Promise<void> {
  await db
    .insert(profileSettings)
    .values(profileToRow(data))
    .onConflictDoUpdate({
      target: profileSettings.id,
      set: {
        name: data.name,
        username: data.username ?? null,
        currency: data.currency,
        appearance: data.appearance,
        showSplitBillsInTransactions: data.showSplitBillsInTransactions,
        receiptThermalLook: data.receiptThermalLook,
      },
    });
}

export async function ensureDefaultProfile(db: DebtlyDatabase): Promise<void> {
  const rows = await db.select().from(profileSettings).where(eq(profileSettings.id, 1));
  if (rows.length === 0) {
    await replaceProfile(db, DEFAULT_PROFILE);
  }
}
