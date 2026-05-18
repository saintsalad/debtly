import type { SQLiteDatabase } from 'expo-sqlite';
import { openDatabase } from '@/lib/db/client';
import { importFromLegacyStorageIfNeeded } from '@/lib/db/importFromLegacyStorage';
import { hydrateStoresFromDatabase, syncDebtsAfterHydration } from '@/lib/db/hydrate';
import { runMigrations } from '@/lib/db/migrate';

export async function bootstrapDatabase(sqliteDb: SQLiteDatabase): Promise<void> {
  const db = await openDatabase(sqliteDb);
  await runMigrations(db, sqliteDb);
  await importFromLegacyStorageIfNeeded(db);
  await hydrateStoresFromDatabase(db);
  syncDebtsAfterHydration();
}
