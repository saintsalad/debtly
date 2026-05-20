import * as Linking from 'expo-linking';

const INVITE_CODE_PARAM_RE = /[?&]code=([^&#\s]+)/i;

function queryParamCode(queryParams: Linking.QueryParams | null | undefined): string | null {
  const raw = queryParams?.code;
  const code = Array.isArray(raw) ? raw[0] : raw;
  if (typeof code !== 'string' || !code.trim()) return null;
  return code.trim().replace(/\s+/g, '').toUpperCase();
}

/** Fallback when `Linking.parse` omits query params (common with custom schemes on device). */
function extractCodeFromUrlString(url: string): string | null {
  const match = url.match(INVITE_CODE_PARAM_RE);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]).trim().replace(/\s+/g, '').toUpperCase();
  } catch {
    return match[1].trim().replace(/\s+/g, '').toUpperCase();
  }
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
  return queryParamCode(parsed.queryParams) ?? extractCodeFromUrlString(url);
}

/** Accept pasted link or raw token; normalize to uppercase invite code. */
export function parseInviteCodeFromLinkOrRaw(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const looksLikeUrl = trimmed.includes('://') || trimmed.toLowerCase().startsWith('http');
  if (looksLikeUrl) {
    return parseInviteCodeFromUrl(trimmed);
  }
  return trimmed.replace(/\s+/g, '').toUpperCase();
}
