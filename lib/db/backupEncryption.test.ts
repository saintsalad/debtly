import { describe, expect, it } from 'vitest';

import { buildSignedBackupEnvelope } from '@/lib/db/backupIntegrity';
import type { ExportData } from '@/lib/db/exportImportTypes';
import {
  BACKUP_DECRYPT_ERROR,
  BACKUP_KEY_DERIVATION,
  decryptToSignedEnvelope,
  encryptSignedEnvelope,
  ENCRYPTED_BACKUP_FORMAT,
  isEncryptedBackupFile,
} from '@/lib/db/backupEncryption';

const samplePayload: ExportData = {
  version: 1,
  exportedAt: '2026-05-20T00:00:00.000Z',
  profile: {
    name: 'Alex',
    username: 'alex',
    currency: 'PHP',
    appearance: 'system',
    showSplitBillsInTransactions: false,
    receiptThermalLook: true,
    avatarUri: null,
  },
  debts: [
    {
      id: 'd1',
      personName: 'Bob',
      principalMinor: 100,
      type: 'owed_to_me',
      status: 'pending',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ],
  groups: {
    groups: [],
    expenses: [],
    settlements: [],
    activityLog: [],
    pendingOps: [],
  },
  billSplits: [],
};

describe('backupEncryption', () => {
  it('round-trips with app-managed key', async () => {
    const signed = await buildSignedBackupEnvelope(samplePayload);
    const encrypted = encryptSignedEnvelope(signed);
    expect(encrypted.format).toBe(ENCRYPTED_BACKUP_FORMAT);
    expect(encrypted.keyDerivation).toBe(BACKUP_KEY_DERIVATION);
    expect(isEncryptedBackupFile(encrypted)).toBe(true);

    const decrypted = decryptToSignedEnvelope(encrypted);
    expect(decrypted.payload).toEqual(signed.payload);
    expect(decrypted.signature).toBe(signed.signature);
  });

  it('rejects tampered ciphertext', async () => {
    const signed = await buildSignedBackupEnvelope(samplePayload);
    const encrypted = encryptSignedEnvelope(signed);
    const tampered = {
      ...encrypted,
      ciphertext: encrypted.ciphertext.slice(0, -4) + 'aaaa',
    };
    expect(() => decryptToSignedEnvelope(tampered)).toThrow(BACKUP_DECRYPT_ERROR);
  });

  it('does not expose plaintext in outer file', async () => {
    const signed = await buildSignedBackupEnvelope(samplePayload);
    const encrypted = encryptSignedEnvelope(signed);
    const serialized = JSON.stringify(encrypted);
    expect(serialized).not.toContain('Alex');
    expect(serialized).not.toContain('Bob');
  });
});
