import { migrateDebts } from '@/features/debts/debtMigration';
import type { Debt } from '@/features/debts/types';
import type { BillSplit } from '@/features/bill-split/types';
import type { GroupExpenseState } from '@/features/group-expense/types';
import { migratePersistedState } from '@/features/group-expense/billSplitMigration';
import { migrateGroupPersistedState } from '@/lib/db/migrateGroupPersistedState';
import { PERSIST_KEYS } from '@/lib/db/meta';
import { DEFAULT_PROFILE, type ProfileData } from '@/lib/db/mappers/profile';

interface ZustandPersistEnvelope<T> {
  state?: T;
  version?: number;
}

function parseEnvelope<T>(raw: string | null): { state: T | null; version: number } {
  if (!raw) return { state: null, version: 0 };
  try {
    const parsed = JSON.parse(raw) as ZustandPersistEnvelope<T> | T;
    if (parsed && typeof parsed === 'object' && 'state' in parsed) {
      return {
        state: (parsed as ZustandPersistEnvelope<T>).state ?? null,
        version: (parsed as ZustandPersistEnvelope<T>).version ?? 0,
      };
    }
    return { state: parsed as T, version: 0 };
  } catch {
    return { state: null, version: 0 };
  }
}

export interface LegacyImportPayload {
  profile: ProfileData;
  debts: Debt[];
  groupState: GroupExpenseState;
  billSplits: BillSplit[];
  hadAnyLegacyData: boolean;
}

export type LegacyStorageRaw = Partial<{
  profile: string | null;
  debts: string | null;
  groups: string | null;
  billSplits: string | null;
}>;

/** Parse legacy AsyncStorage payloads without writing to SQLite (for tests). */
export function parseLegacyStoragePayloads(
  raw: LegacyStorageRaw,
  profileName = 'You'
): LegacyImportPayload {
  const profileEnv = parseEnvelope<{
    name?: string;
    currency?: string;
    appearance?: string;
    showSplitBillsInTransactions?: boolean;
    receiptThermalLook?: boolean;
  }>(raw.profile ?? null);

  const profile: ProfileData = {
    name: profileEnv.state?.name ?? DEFAULT_PROFILE.name,
    username: DEFAULT_PROFILE.username,
    currency: profileEnv.state?.currency ?? DEFAULT_PROFILE.currency,
    appearance:
      (profileEnv.state?.appearance as ProfileData['appearance']) ?? DEFAULT_PROFILE.appearance,
    showSplitBillsInTransactions:
      profileEnv.state?.showSplitBillsInTransactions ?? DEFAULT_PROFILE.showSplitBillsInTransactions,
    receiptThermalLook: profileEnv.state?.receiptThermalLook ?? DEFAULT_PROFILE.receiptThermalLook,
    avatarUri: DEFAULT_PROFILE.avatarUri,
  };

  const debtEnv = parseEnvelope<{ debts?: Debt[] }>(raw.debts ?? null);
  const debts = debtEnv.state?.debts != null ? migrateDebts(debtEnv.state.debts) : [];

  let groupEnv = parseEnvelope<GroupExpenseState>(raw.groups ?? null);
  if (!groupEnv.state?.groups?.length) {
    const legacyBillSplits = parseEnvelope<unknown>(raw.billSplits ?? null);
    if (legacyBillSplits.state) {
      groupEnv = {
        state: migratePersistedState(legacyBillSplits.state, profileName),
        version: Math.max(groupEnv.version, legacyBillSplits.version),
      };
    }
  } else {
    groupEnv = {
      state: migrateGroupPersistedState(groupEnv.state, groupEnv.version, profileName),
      version: groupEnv.version,
    };
  }

  const groupState: GroupExpenseState = groupEnv.state ?? {
    groups: [],
    expenses: [],
    settlements: [],
    activityLog: [],
    pendingOps: [],
  };

  const billEnv = parseEnvelope<{ splits?: BillSplit[] }>(raw.billSplits ?? null);
  const billSplits = billEnv.state?.splits ?? [];

  const hadAnyLegacyData = Boolean(
    raw.profile ||
      raw.debts ||
      raw.groups ||
      raw.billSplits ||
      debts.length > 0 ||
      groupState.groups.length > 0 ||
      billSplits.length > 0
  );

  return { profile, debts, groupState, billSplits, hadAnyLegacyData };
}

export function profileNameFromLegacyRaw(profileRaw: string | null): string {
  const env = parseEnvelope<{ name?: string }>(profileRaw);
  return env.state?.name?.trim() || 'You';
}

export { PERSIST_KEYS };
