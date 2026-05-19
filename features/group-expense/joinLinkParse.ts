import * as Linking from 'expo-linking';

function queryParamCode(queryParams: Linking.QueryParams | null | undefined): string | null {
  const raw = queryParams?.code;
  const code = Array.isArray(raw) ? raw[0] : raw;
  if (typeof code !== 'string' || !code.trim()) return null;
  return code.trim().replace(/\s+/g, '').toUpperCase();
}

function urlLooksLikeGroupJoin(url: string, parsed: Linking.ParsedURL): boolean {
  if (/join/i.test(url)) return true;
  const path = typeof parsed.path === 'string' ? parsed.path : '';
  const host = typeof parsed.hostname === 'string' ? parsed.hostname : '';
  return (
    path === 'join' ||
    host === 'join' ||
    path.endsWith('/join') ||
    path.includes('/join') ||
    (host === 'group' && path === 'join')
  );
}

/** Extract invite `code` query param from Debtly join URLs (custom scheme or https). */
export function parseInviteCodeFromUrl(url: string): string | null {
  const parsed = Linking.parse(url);
  if (!urlLooksLikeGroupJoin(url, parsed)) {
    return null;
  }
  return queryParamCode(parsed.queryParams);
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
