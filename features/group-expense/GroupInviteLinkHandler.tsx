import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';

import { isConvexConfigured } from '@/lib/convex/env';
import { useAccountInviteStore } from '@/stores/accountInviteStore';
import { useGroupExpenseStore } from '@/stores/groupExpenseStore';
import { useProfileStore } from '@/stores/profileStore';
import { useConvexAuth } from 'convex/react';

function parseInviteCode(url: string): string | null {
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

/** Join when allowed; stash invite + open signup when Convex requires an authenticated account. */
function followInviteDeepLink(opts: {
  url: string;
  joinGroupByCode: (code: string, displayName: string) => string | null;
  displayName: string;
  router: ReturnType<typeof useRouter>;
  /** When true, deferred until user finishes Convex signup. */
  gated: boolean;
  /** Convex session ready (ignored when gated is false). */
  authReady: boolean;
  setPendingCode: (code: string | null) => void;
}) {
  const { url, joinGroupByCode, displayName, router, gated, authReady, setPendingCode } = opts;
  const code = parseInviteCode(url);
  if (!code) return;

  if (gated && !authReady) {
    setPendingCode(code);
    router.push({
      pathname: '/create-account',
      params: { returnTo: 'pending-invite' },
    });
    return;
  }

  const groupId = joinGroupByCode(code, displayName);
  if (groupId) {
    setPendingCode(null);
    router.push({ pathname: '/group/[id]', params: { id: groupId } });
  }
}

function GroupInviteLinkHandlerCore(props: {
  gated: boolean;
  authReady: boolean;
}) {
  const router = useRouter();
  const joinGroupByCode = useGroupExpenseStore((s) => s.joinGroupByCode);
  const displayName = useProfileStore((s) => s.name) || 'You';
  const setPendingCode = useAccountInviteStore((s) => s.setPendingInviteCode);

  useEffect(() => {
    void Linking.getInitialURL().then((url) => {
      if (!url) return;
      followInviteDeepLink({
        url,
        joinGroupByCode,
        displayName,
        router,
        gated: props.gated,
        authReady: props.authReady,
        setPendingCode,
      });
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      followInviteDeepLink({
        url,
        joinGroupByCode,
        displayName,
        router,
        gated: props.gated,
        authReady: props.authReady,
        setPendingCode,
      });
    });

    return () => subscription.remove();
  }, [
    props.authReady,
    props.gated,
    displayName,
    joinGroupByCode,
    router,
    setPendingCode,
  ]);

  return null;
}

/** Subscribes to `debtly://group/join` links once Convex signup is complete. */
export function GroupInviteConvexHandler() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const authReady = !isLoading && isAuthenticated;
  return <GroupInviteLinkHandlerCore gated authReady={authReady} />;
}

/** Local-only installs (no Convex URL): join groups without account gating. */
export function GroupInviteLocalHandler() {
  return <GroupInviteLinkHandlerCore gated={false} authReady={false} />;
}

export function GroupInviteLinkHandler() {
  return isConvexConfigured() ? <GroupInviteConvexHandler /> : <GroupInviteLocalHandler />;
}
