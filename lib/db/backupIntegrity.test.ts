import { describe, expect, it } from 'vitest';

import {
  BACKUP_INTEGRITY_ERROR,
  buildSignedBackupEnvelope,
  canonicalPayloadString,
  isSignedBackupEnvelope,
  signBackupPayload,
  verifyBackupPayload,
} from '@/lib/db/backupIntegrity';
import type { ExportData } from '@/lib/db/exportImportTypes';

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
  debts: [],
  groups: {
    groups: [],
    expenses: [],
    settlements: [],
    activityLog: [],
    pendingOps: [],
  },
  billSplits: [],
};

describe('backupIntegrity', () => {
  it('produces stable canonical JSON', () => {
    const a = canonicalPayloadString(samplePayload);
    const b = canonicalPayloadString({ ...samplePayload });
    expect(a).toBe(b);
    expect(a).not.toContain('\n');
  });

  it('signs and verifies an intact payload', async () => {
    const signature = await signBackupPayload(samplePayload);
    expect(signature).toMatch(/^[0-9a-f]{64}$/);
    await expect(verifyBackupPayload(samplePayload, signature)).resolves.toBe(true);
  });

  it('rejects a tampered payload', async () => {
    const signature = await signBackupPayload(samplePayload);
    const tampered: ExportData = {
      ...samplePayload,
      profile: { ...samplePayload.profile, name: 'Attacker' },
    };
    await expect(verifyBackupPayload(tampered, signature)).resolves.toBe(false);
  });

  it('rejects invalid signature format', async () => {
    await expect(verifyBackupPayload(samplePayload, 'not-a-hex-digest')).resolves.toBe(false);
  });

  it('builds a signed envelope', async () => {
    const envelope = await buildSignedBackupEnvelope(samplePayload);
    expect(isSignedBackupEnvelope(envelope)).toBe(true);
    await expect(verifyBackupPayload(envelope.payload, envelope.signature)).resolves.toBe(true);
  });

  it('detects envelope shape', () => {
    expect(isSignedBackupEnvelope({ format: 1, algorithm: 'HMAC-SHA256', payload: {}, signature: 'ab' })).toBe(
      true
    );
    expect(isSignedBackupEnvelope(samplePayload)).toBe(false);
  });

  it('exports integrity error constant for UI', () => {
    expect(BACKUP_INTEGRITY_ERROR).toContain('modified');
  });
});
