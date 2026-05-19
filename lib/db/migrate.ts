import type { SQLiteDatabase } from 'expo-sqlite';
import type { DebtlyDatabase } from '@/lib/db/client';
import { INITIAL_MIGRATION_SQL } from '@/lib/db/initialMigrationSql';
import migrations from '@/drizzle/migrations/migrations';

function assertBundledMigrations(): void {
  const sql0 = migrations.migrations.m0000;
  const sql1 = migrations.migrations.m0001;
  if (typeof sql0 !== 'string' || sql0.length < 50) {
    throw new Error(
      'Database migration SQL is missing. Restart Metro with: npx expo start --clear'
    );
  }
  if (typeof sql1 !== 'string' || sql1.length < 10) {
    throw new Error(
      'Database migration m0001 is missing. Restart Metro with: npx expo start --clear'
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

/** Idempotent — m0000 must not include username; m0001 adds it for upgrades. */
async function ensureProfileUsernameColumn(sqliteDb: SQLiteDatabase): Promise<void> {
  const cols = await sqliteDb.getAllAsync<{ name: string }>(
    "PRAGMA table_info('profile_settings')"
  );
  if (!cols.some((c) => c.name === 'username')) {
    await sqliteDb.execAsync(
      'ALTER TABLE `profile_settings` ADD COLUMN `username` text;'
    );
  }
}

async function ensureProfileAvatarUriColumn(sqliteDb: SQLiteDatabase): Promise<void> {
  const cols = await sqliteDb.getAllAsync<{ name: string }>(
    "PRAGMA table_info('profile_settings')"
  );
  if (!cols.some((c) => c.name === 'avatar_uri')) {
    await sqliteDb.execAsync(
      'ALTER TABLE `profile_settings` ADD COLUMN `avatar_uri` text;'
    );
  }
}

async function hasCoreSchema(sqliteDb: SQLiteDatabase): Promise<boolean> {
  const row = await sqliteDb.getFirstAsync<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table' AND name='debts'"
  );
  return (row?.cnt ?? 0) > 0;
}

export async function runMigrations(
  db: DebtlyDatabase,
  sqliteDb: SQLiteDatabase
): Promise<void> {
  assertBundledMigrations();
  void db;
  const existingSchema = await hasCoreSchema(sqliteDb);

  if (!existingSchema) {
    await runFallbackMigration(sqliteDb);
  }

  await ensureProfileUsernameColumn(sqliteDb);
  await ensureProfileAvatarUriColumn(sqliteDb);
}
