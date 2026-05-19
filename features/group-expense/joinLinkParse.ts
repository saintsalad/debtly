import * as Linking from 'expo-linking';

/** Extract invite `code` query param from Debtly join URLs (custom scheme or https). */
export function parseInviteCodeFromUrl(url: string): string | null {
  const parsed = Linking.parse(url);
  const isJoin =
    parsed.path === 'join' ||
    parsed.hostname === 'join' ||
    (typeof parsed.path === 'string' && parsed.path.includes('join'));

  if (!isJoin) return null;

  const code = parsed.queryParams?.code;
  if (typeof code !== 'string' || !code.trim()) return null;
  return code.trim().toUpperCase();
}

/** Accept pasted link or raw token; normalize to uppercase invite code. */
export function parseInviteCodeFromLinkOrRaw(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.includes('://') || trimmed.toLowerCase().startsWith('http')) {
    const fromUrl = parseInviteCodeFromUrl(trimmed);
    if (fromUrl) return fromUrl;
  }
  return trimmed.replace(/\s+/g, '').toUpperCase();
}
