/** Must stay in sync with `DEBTLY_ACCOUNT_EMAIL_DOMAIN` in `convex/auth.ts`. */
export const DEBTLY_ACCOUNT_EMAIL_DOMAIN = '@debtly-account.local';

export function normalizeUsernameSlug(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidUsernameSlug(slug: string): boolean {
  return /^[a-z0-9_]{3,20}$/.test(slug.trim().toLowerCase());
}

export function usernameToSyntheticEmail(slug: string): string {
  return `${normalizeUsernameSlug(slug)}${DEBTLY_ACCOUNT_EMAIL_DOMAIN.toLowerCase()}`;
}
