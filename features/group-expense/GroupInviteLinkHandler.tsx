import { api } from '@/convex/_generated/api';
import { parseInviteCodeFromUrl } from '@/features/group-expense/joinLinkParse';
import { joinSplitGroupFromInvite } from '@/features/group-expense/joinSplitGroupFlow';
import { isConvexConfigured } from '@/lib/convex/env';
import { useAccountInviteStore } from '@/stores/accountInviteStore';
import { useGroupExpenseStore } from '@/stores/groupExpenseStore';
import { useProfileStore } from '@/stores/profileStore';
import { useConvexAuth } from 'convex/react';
import { useMutation } from 'convex/react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

/** Join when signed in; otherwise stash invite code and explain sign-in before account creation. */
async function followInviteDeepLink(opts: {
  url: string;
  joinGroupByCode: (code: string, displayName: string) => string | null;
  joinConvex: (code: string) => Promise<{ groupId: string }>;
  displayName: string;
  router: ReturnType<typeof useRouter>;
  gated: boolean;
  authReady: boolean;
  setPendingCode: (code: string | null) => void;
  convexConfigured: boolean;
}) {
  const {
    url,
    joinGroupByCode,
    joinConvex,
    displayName,
    router,
    gated,
    authReady,
    setPendingCode,
    convexConfigured,
  } = opts;
  const code = parseInviteCodeFromUrl(url);
  if (!code) return;

  if (gated && !authReady) {
    setPendingCode(code);
    router.push({ pathname: '/sign-in-required' });
    return;
  }

  const joined = await joinSplitGroupFromInvite({
    rawCodeOrLink: code,
    displayName,
    preferConvex: convexConfigured && authReady,
    convexJoin: joinConvex,
    localJoin: joinGroupByCode,
  });

  if (joined) {
    setPendingCode(null);
    router.push({ pathname: '/group/[id]', params: { id: joined.groupId } });
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
  const joinConvex = useMutation(api.splitGroups.joinByInviteCode);
  const convexConfigured = isConvexConfigured();

  const joinConvexRef = useRef(joinConvex);
  joinConvexRef.current = joinConvex;

  useEffect(() => {
    void Linking.getInitialURL().then((url) => {
      if (!url) return;
      void followInviteDeepLink({
        url,
        joinGroupByCode,
        joinConvex: (c) => joinConvexRef.current({ code: c }),
        displayName,
        router,
        gated: props.gated,
        authReady: props.authReady,
        setPendingCode,
        convexConfigured,
      });
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      void followInviteDeepLink({
        url,
        joinGroupByCode,
        joinConvex: (c) => joinConvexRef.current({ code: c }),
        displayName,
        router,
        gated: props.gated,
        authReady: props.authReady,
        setPendingCode,
        convexConfigured,
      });
    });

    return () => subscription.remove();
  }, [
    props.authReady,
    props.gated,
    convexConfigured,
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
