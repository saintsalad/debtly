import * as SQLite from 'expo-sqlite';
import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import * as schema from '@/lib/db/schema';

export const DATABASE_NAME = 'debtly.db';

let dbInstance: ExpoSQLiteDatabase<typeof schema> | null = null;

export type DebtlyDatabase = ExpoSQLiteDatabase<typeof schema>;

export function getDb(): DebtlyDatabase {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call openDatabase() first.');
  }
  return dbInstance;
}

export async function openDatabase(
  sqliteDb: SQLite.SQLiteDatabase
): Promise<DebtlyDatabase> {
  await sqliteDb.execAsync('PRAGMA journal_mode = WAL;');
  await sqliteDb.execAsync('PRAGMA foreign_keys = ON;');
  await sqliteDb.execAsync('PRAGMA busy_timeout = 5000;');
  dbInstance = drizzle(sqliteDb, { schema });
  return dbInstance;
}

export function resetDbForTests(): void {
  dbInstance = null;
}
