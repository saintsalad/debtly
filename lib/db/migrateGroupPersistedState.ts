import { rebuildActivityLogFromState } from '@/features/group-expense/activityLog';
import { migratePersistedState } from '@/features/group-expense/billSplitMigration';
import type { GroupExpenseState, SplitGroup } from '@/features/group-expense/types';

/**
 * Applies Zustand persist version steps (v2–v4) to raw persisted group state.
 * Shared by legacy AsyncStorage import and former persist migrate().
 */
export function migrateGroupPersistedState(
  persisted: unknown,
  version: number,
  profileName: string
): GroupExpenseState {
  if (version < 2) {
    return {
      groups: [],
      expenses: [],
      settlements: [],
      activityLog: [],
      pendingOps: [],
    };
  }

  let migrated = migratePersistedState(persisted, profileName);

  if (version < 3 && migrated.activityLog.length === 0 && migrated.groups.length > 0) {
    migrated = { ...migrated, activityLog: rebuildActivityLogFromState(migrated) };
  }

  if (version < 4) {
    migrated = {
      ...migrated,
      groups: migrated.groups.map((g) => {
        const { informalBalanceSettled: _removed, ...rest } = g as SplitGroup & {
          informalBalanceSettled?: Record<string, boolean>;
        };
        return rest;
      }),
    };
  }

  return migrated;
}
