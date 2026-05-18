import journal from './meta/_journal.json';
import { INITIAL_MIGRATION_SQL } from '@/lib/db/initialMigrationSql';

export default {
  journal,
  migrations: {
    m0000: INITIAL_MIGRATION_SQL,
  },
};
