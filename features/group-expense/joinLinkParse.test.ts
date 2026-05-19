import { describe, expect, it, vi } from 'vitest';

/** Avoid pulling `react-native` into Vitest via `expo-linking`. */
vi.mock('expo-linking', () => ({
  parse(url: string) {
    if (/^https?:\/\//i.test(url)) {
      try {
        const u = new URL(url);
        const queryParams: Record<string, string> = {};
        u.searchParams.forEach((v, k) => {
          queryParams[k] = v;
        });
        return {
          path: u.pathname.replace(/^\//, ''),
          hostname: u.hostname,
          queryParams,
        };
      } catch {
        return { path: '', hostname: '', queryParams: {} };
      }
    }
    const stripScheme = url.replace(/^([a-z][a-z0-9+.-]*):\/\//i, '');
    const qIndex = stripScheme.indexOf('?');
    const pathPart = qIndex >= 0 ? stripScheme.slice(0, qIndex) : stripScheme;
    const queryStr = qIndex >= 0 ? stripScheme.slice(qIndex + 1) : '';
    const queryParams: Record<string, string> = {};
    new URLSearchParams(queryStr).forEach((v, k) => {
      queryParams[k] = v;
    });
    return { path: pathPart, hostname: '', queryParams };
  },
}));

import {
  parseInviteCodeFromLinkOrRaw,
  parseInviteCodeFromUrl,
} from '@/features/group-expense/joinLinkParse';

describe('joinLinkParse', () => {
  it('parses code query from debtly join URL', () => {
    expect(parseInviteCodeFromUrl('debtly://group/join?code=abc123')).toBe('ABC123');
  });

  it('parses https-style join paths when marked as join', () => {
    expect(parseInviteCodeFromUrl('https://example.test/join?code=yz')).toBe('YZ');
  });

  it('returns null when path is not a join URL', () => {
    expect(parseInviteCodeFromUrl('debtly://group/other?code=x')).toBeNull();
  });

  it('normalizes raw pasted codes', () => {
    expect(parseInviteCodeFromLinkOrRaw('  ab cd  ')).toBe('ABCD');
  });

  it('delegates URLs to parseInviteCodeFromUrl', () => {
    expect(parseInviteCodeFromLinkOrRaw('debtly://group/join?code=zzz')).toBe('ZZZ');
  });

  it('accepts http URLs', () => {
    expect(parseInviteCodeFromLinkOrRaw('http://host/join?code=aa')).toBe('AA');
  });
});
