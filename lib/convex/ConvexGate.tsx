import { ConvexReactClient } from 'convex/react';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { ConvexAuthProvider } from '@convex-dev/auth/react';
import { router, type Href } from 'expo-router';

import { convexSecureTokenStorage } from '@/lib/convex/convexSecureStorage';
import { getExpoConvexUrl, isConvexConfigured } from '@/lib/convex/env';

let cachedClient: ConvexReactClient | null = null;

function getOrCreateConvexClient(): ConvexReactClient | null {
  const url = getExpoConvexUrl();
  if (!url) return null;
  if (!cachedClient) {
    cachedClient = new ConvexReactClient(url, { unsavedChangesWarning: false });
  }
  return cachedClient;
}

/**
 * When `EXPO_PUBLIC_CONVEX_URL` is set: wraps children with Convex + Convex Auth.
 * Offline / no URL: renders children unchanged (invite sharing works without login).
 */
export function ConvexGate({ children }: { children: ReactNode }) {
  const client = useMemo(() => getOrCreateConvexClient(), []);

  if (!isConvexConfigured() || !client) {
    return children;
  }

  return (
    <ConvexAuthProvider
      client={client}
      storage={convexSecureTokenStorage}
      replaceURL={(relativeUrl: string) => {
        router.replace(relativeUrl as Href);
      }}>
      {children}
    </ConvexAuthProvider>
  );
}
