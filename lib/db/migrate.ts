import type { SQLiteDatabase } from 'expo-sqlite';
import type { DebtlyDatabase } from '@/lib/db/client';
import { INITIAL_MIGRATION_SQL } from '@/lib/db/initialMigrationSql';
import migrations from '@/drizzle/migrations/migrations';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

function assertBundledMigrations(): void {
  const sql = migrations.migrations.m0000;
  if (typeof sql !== 'string' || sql.length < 50) {
    throw new Error(
      'Database migration SQL is missing. Restart Metro with: npx expo start --clear'
    );
  }
}

async function runFallbackMigration(sqliteDb: SQLiteDatabase): Promise<void> {
  const statements = INITIAL_MIGRATION_SQL.split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const statement of statements) {
    await sqliteDb.execAsync(statement);
  }
}

export async function runMigrations(
  db: DebtlyDatabase,
  sqliteDb: SQLiteDatabase
): Promise<void> {
  assertBundledMigrations();
  try {
    await migrate(db, migrations);
  } catch (error) {
    console.warn('[db] Drizzle migrator failed, applying fallback SQL', error);
    await runFallbackMigration(sqliteDb);
  }
}
