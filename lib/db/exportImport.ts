import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

import type { DebtlyDatabase } from '@/lib/db/client';
import type { ProfileData } from '@/lib/db/mappers/profile';
import type { GroupExpenseState } from '@/features/group-expense/types';
import {
  BACKUP_INTEGRITY_ERROR,
  buildSignedBackupEnvelope,
  isSignedBackupEnvelope,
  verifyBackupPayload,
  type SignedBackupEnvelope,
} from '@/lib/db/backupIntegrity';
import {
  BACKUP_DECRYPT_ERROR,
  decryptToSignedEnvelope,
  encryptSignedEnvelope,
  isEncryptedBackupFile,
} from '@/lib/db/backupEncryption';
import { EXPORT_DATA_VERSION, type ExportData } from '@/lib/db/exportImportTypes';
import { loadProfile, replaceProfile } from '@/lib/db/repositories/profileRepository';
import { loadDebts, replaceDebts } from '@/lib/db/repositories/debtRepository';
import { loadGroupState, replaceGroupState } from '@/lib/db/repositories/groupRepository';
import { loadBillSplits, replaceBillSplits } from '@/lib/db/repositories/billSplitRepository';
import { useProfileStore } from '@/stores/profileStore';
import { useDebtStore } from '@/stores/debtStore';
import { useGroupExpenseStore } from '@/stores/groupExpenseStore';
import { useBillSplitStore } from '@/stores/billSplitStore';

export type { ExportData } from '@/lib/db/exportImportTypes';
export { BACKUP_DECRYPT_ERROR } from '@/lib/db/backupEncryption';

const EXPORT_FILENAME = 'debtly-backup';

export const BACKUP_UNSUPPORTED_FORMAT =
  'This backup is not encrypted or is from an older version. Export a new backup from Debtly and try again.';

export async function exportAllData(db: DebtlyDatabase): Promise<string> {
  const [profile, debts, groups, billSplits] = await Promise.all([
    loadProfile(db),
    loadDebts(db),
    loadGroupState(db),
    loadBillSplits(db),
  ]);

  const exportData: ExportData = {
    version: EXPORT_DATA_VERSION,
    exportedAt: new Date().toISOString(),
    profile,
    debts,
    groups,
    billSplits,
  };

  const signed = await buildSignedBackupEnvelope(exportData);
  const encrypted = encryptSignedEnvelope(signed);
  const jsonString = JSON.stringify(encrypted, null, 2);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${EXPORT_FILENAME}-${timestamp}.json`;
  const dir = FileSystem.cacheDirectory;
  if (!dir) {
    throw new Error('App storage is not available.');
  }
  const fileUri = `${dir}${filename}`;

  await FileSystem.writeAsStringAsync(fileUri, jsonString);

  return fileUri;
}

export async function shareExportedData(db: DebtlyDatabase): Promise<boolean> {
  try {
    const fileUri = await exportAllData(db);

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      throw new Error('Sharing is not available on this device');
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Export Debtly Data',
      UTI: 'public.json',
    });

    return true;
  } catch (error) {
    console.error('[exportImport] Export failed:', error);
    throw error;
  }
}

function validateExportData(data: unknown): data is ExportData {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.version !== 'number') {
    return false;
  }

  if (typeof obj.exportedAt !== 'string') {
    return false;
  }

  if (typeof obj.profile !== 'object' || obj.profile === null) {
    return false;
  }

  if (!Array.isArray(obj.debts)) {
    return false;
  }

  if (typeof obj.groups !== 'object' || obj.groups === null) {
    return false;
  }

  const groups = obj.groups as Record<string, unknown>;
  if (
    !Array.isArray(groups.groups) ||
    !Array.isArray(groups.expenses) ||
    !Array.isArray(groups.settlements) ||
    !Array.isArray(groups.activityLog) ||
    !Array.isArray(groups.pendingOps)
  ) {
    return false;
  }

  if (!Array.isArray(obj.billSplits)) {
    return false;
  }

  return true;
}

function validateProfileData(profile: unknown): profile is ProfileData {
  if (typeof profile !== 'object' || profile === null) {
    return false;
  }

  const p = profile as Record<string, unknown>;
  return (
    typeof p.name === 'string' &&
    typeof p.currency === 'string' &&
    typeof p.appearance === 'string'
  );
}

async function parseSignedEnvelope(envelope: SignedBackupEnvelope): Promise<ExportData> {
  const { payload, signature } = envelope;

  const valid = await verifyBackupPayload(payload, signature);
  if (!valid) {
    throw new Error(BACKUP_INTEGRITY_ERROR);
  }

  if (!validateExportData(payload)) {
    throw new Error('Invalid backup file format');
  }

  if (payload.version > EXPORT_DATA_VERSION) {
    throw new Error(
      `Backup file version (${payload.version}) is newer than supported (${EXPORT_DATA_VERSION}). Please update the app.`
    );
  }

  if (!validateProfileData(payload.profile)) {
    throw new Error('Invalid profile data in backup file');
  }

  return payload;
}

async function resolveSignedEnvelope(parsed: unknown): Promise<SignedBackupEnvelope> {
  if (isEncryptedBackupFile(parsed)) {
    return decryptToSignedEnvelope(parsed);
  }

  if (isSignedBackupEnvelope(parsed)) {
    throw new Error(BACKUP_UNSUPPORTED_FORMAT);
  }

  throw new Error(BACKUP_UNSUPPORTED_FORMAT);
}

export async function pickImportFile(): Promise<string | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    return result.assets[0].uri;
  } catch (error) {
    console.error('[exportImport] File pick failed:', error);
    throw error;
  }
}

export async function parseImportFile(fileUri: string): Promise<ExportData> {
  try {
    const content = await FileSystem.readAsStringAsync(fileUri);
    const parsed: unknown = JSON.parse(content);
    const envelope = await resolveSignedEnvelope(parsed);
    return await parseSignedEnvelope(envelope);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON file');
    }
    throw error;
  }
}

export async function importData(db: DebtlyDatabase, data: ExportData): Promise<void> {
  const normalizedProfile: ProfileData = {
    name: data.profile.name || 'Friend',
    username: data.profile.username ?? null,
    currency: data.profile.currency || 'PHP',
    appearance: data.profile.appearance || 'system',
    showSplitBillsInTransactions: data.profile.showSplitBillsInTransactions ?? false,
    receiptThermalLook: data.profile.receiptThermalLook ?? true,
    avatarUri: data.profile.avatarUri ?? null,
  };

  const normalizedGroups: GroupExpenseState = {
    groups: data.groups.groups || [],
    expenses: data.groups.expenses || [],
    settlements: data.groups.settlements || [],
    activityLog: data.groups.activityLog || [],
    pendingOps: data.groups.pendingOps || [],
  };

  await replaceProfile(db, normalizedProfile);
  await replaceDebts(db, data.debts || []);
  await replaceGroupState(db, normalizedGroups);
  await replaceBillSplits(db, data.billSplits || []);

  useProfileStore.setState({
    name: normalizedProfile.name,
    username: normalizedProfile.username,
    currency: normalizedProfile.currency,
    appearance: normalizedProfile.appearance,
    showSplitBillsInTransactions: normalizedProfile.showSplitBillsInTransactions,
    receiptThermalLook: normalizedProfile.receiptThermalLook,
    avatarUri: normalizedProfile.avatarUri,
  });

  useDebtStore.setState({ debts: data.debts || [] });
  useGroupExpenseStore.setState(normalizedGroups);
  useBillSplitStore.setState({ splits: data.billSplits || [] });
}

export interface ImportResult {
  success: boolean;
  stats: {
    debtsCount: number;
    groupsCount: number;
    expensesCount: number;
    billSplitsCount: number;
  };
}

export async function importFromFile(db: DebtlyDatabase): Promise<ImportResult | null> {
  const fileUri = await pickImportFile();
  if (!fileUri) {
    return null;
  }

  const data = await parseImportFile(fileUri);
  await importData(db, data);

  return {
    success: true,
    stats: {
      debtsCount: data.debts?.length || 0,
      groupsCount: data.groups?.groups?.length || 0,
      expensesCount: data.groups?.expenses?.length || 0,
      billSplitsCount: data.billSplits?.length || 0,
    },
  };
}
