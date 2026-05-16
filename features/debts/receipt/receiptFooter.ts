export function formatReceiptFooterTagline(deviceModel: string): string {
  const label = deviceModel.trim() || 'DEVICE';
  return `GENERATED LOCALLY VIA ${label.toUpperCase()}`;
}
