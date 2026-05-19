import { Password } from '@convex-dev/auth/providers/Password';
import { convexAuth } from '@convex-dev/auth/server';
import { ConvexError } from 'convex/values';

/** Synthetic Convex Auth email backing a public username (`${slug}@debtly-account.local`). */
export const DEBTLY_ACCOUNT_EMAIL_DOMAIN = '@debtly-account.local';

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        const email = ((params.email as string) ?? '').trim().toLowerCase();
        const name = ((params.name as string) ?? '').trim();
        const username = ((params.username as string) ?? '').trim().toLowerCase();
        if (!email.endsWith(DEBTLY_ACCOUNT_EMAIL_DOMAIN.toLowerCase())) {
          throw new ConvexError('Invalid account identifier.');
        }
        const expected = `${username}${DEBTLY_ACCOUNT_EMAIL_DOMAIN.toLowerCase()}`;
        if (email !== expected) {
          throw new ConvexError('Username and account identifier mismatch.');
        }
        if (!name) {
          throw new ConvexError('Display name is required.');
        }
        if (!/^[a-z0-9_]{3,20}$/.test(username)) {
          throw new ConvexError(
            'Username must be 3–20 characters (letters, numbers, underscore only).'
          );
        }
        return { email, name, username };
      },
      validatePasswordRequirements: (password: string) => {
        if (!/^\d{6}$/.test(password)) {
          throw new ConvexError('PIN must be exactly 6 digits.');
        }
      },
    }),
  ],
});
