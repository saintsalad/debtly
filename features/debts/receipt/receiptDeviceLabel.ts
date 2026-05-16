import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { formatReceiptFooterTagline } from '@/features/debts/receipt/receiptFooter';

export function getReceiptDeviceModelLabel(): string {
  const model = Device.modelName?.trim();
  if (model) return model;
  if (Platform.OS === 'ios') return 'iPhone';
  if (Platform.OS === 'android') return 'Android';
  return 'Device';
}

export function getReceiptFooterTagline(): string {
  if (Platform.OS === 'android') {
    return formatReceiptFooterTagline('Android');
  }
  return formatReceiptFooterTagline(getReceiptDeviceModelLabel());
}
