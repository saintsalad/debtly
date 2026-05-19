import journal from './meta/_journal.json';
import { INITIAL_MIGRATION_SQL } from '@/lib/db/initialMigrationSql';
// Kept inline so Metro/Babel resolves without extra loaders.
// Username column is ensured idempotently in migrate.ts after migrator runs.
const MIGRATION_0001_USERNAME = `SELECT 1;\n--> statement-breakpoint`;

export default {
  journal,
  migrations: {
    m0000: INITIAL_MIGRATION_SQL,
    m0001: MIGRATION_0001_USERNAME,
  },
};
