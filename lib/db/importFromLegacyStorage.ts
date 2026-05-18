import type { DebtlyDatabase } from '@/lib/db/client';
import { LEGACY_IMPORT_DONE_KEY, PERSIST_KEYS } from '@/lib/db/meta';
import {
  parseLegacyStoragePayloads,
  profileNameFromLegacyRaw,
} from '@/lib/db/parseLegacyStorage';
import { replaceBillSplits } from '@/lib/db/repositories/billSplitRepository';
import { replaceDebts } from '@/lib/db/repositories/debtRepository';
import { replaceGroupState } from '@/lib/db/repositories/groupRepository';
import { replaceProfile } from '@/lib/db/repositories/profileRepository';
import { zustandStorage } from '@/lib/storage';
import { appMeta } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export type { LegacyImportPayload } from '@/lib/db/parseLegacyStorage';
export { parseLegacyStoragePayloads } from '@/lib/db/parseLegacyStorage';

export async function isLegacyImportDone(db: DebtlyDatabase): Promise<boolean> {
  const rows = await db
    .select()
    .from(appMeta)
    .where(eq(appMeta.key, LEGACY_IMPORT_DONE_KEY));
  return rows[0]?.value === '1';
}

async function markLegacyImportDone(db: DebtlyDatabase): Promise<void> {
  await db
    .insert(appMeta)
    .values({ key: LEGACY_IMPORT_DONE_KEY, value: '1' })
    .onConflictDoUpdate({
      target: appMeta.key,
      set: { value: '1' },
    });
}

export async function importFromLegacyStorageIfNeeded(db: DebtlyDatabase): Promise<boolean> {
  if (await isLegacyImportDone(db)) {
    return false;
  }

  try {
    const [profileRaw, debtsRaw, groupsRaw, billSplitsRaw] = await Promise.all([
      zustandStorage.getItem(PERSIST_KEYS.profile),
      zustandStorage.getItem(PERSIST_KEYS.debts),
      zustandStorage.getItem(PERSIST_KEYS.groups),
      zustandStorage.getItem(PERSIST_KEYS.billSplits),
    ]);

    const payload = parseLegacyStoragePayloads(
      {
        profile: profileRaw,
        debts: debtsRaw,
        groups: groupsRaw,
        billSplits: billSplitsRaw,
      },
      profileNameFromLegacyRaw(profileRaw)
    );

    if (payload.hadAnyLegacyData) {
      await replaceProfile(db, payload.profile);
      await replaceDebts(db, payload.debts);
      await replaceGroupState(db, payload.groupState);
      await replaceBillSplits(db, payload.billSplits);
    }

    await markLegacyImportDone(db);
    return payload.hadAnyLegacyData;
  } catch (error) {
    console.error('[db] legacy AsyncStorage import failed', error);
    await markLegacyImportDone(db);
    return false;
  }
}
