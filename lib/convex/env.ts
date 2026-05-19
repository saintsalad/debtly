/**
 * Public Convex deployment URL (WebSocket endpoint).
 * Set in `.env` as EXPO_PUBLIC_CONVEX_URL — see Convex dashboard Quickstart → React Native / Expo.
 */
export function getExpoConvexUrl(): string {
  const url = typeof process.env.EXPO_PUBLIC_CONVEX_URL === 'string'
    ? process.env.EXPO_PUBLIC_CONVEX_URL.trim()
    : '';
  return url;
}

export function isConvexConfigured(): boolean {
  return getExpoConvexUrl().length > 0;
}
