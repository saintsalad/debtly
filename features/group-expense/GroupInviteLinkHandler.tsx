import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useGroupExpenseStore } from '@/stores/groupExpenseStore';
import { useProfileStore } from '@/stores/profileStore';

function handleInviteUrl(
  url: string,
  joinGroupByCode: (code: string, displayName: string) => string | null,
  displayName: string,
  router: ReturnType<typeof useRouter>
) {
  const parsed = Linking.parse(url);
  const isJoin =
    parsed.path === 'join' ||
    parsed.hostname === 'join' ||
    (typeof parsed.path === 'string' && parsed.path.includes('join'));

  if (!isJoin) return;

  const code = parsed.queryParams?.code;
  if (typeof code !== 'string' || !code.trim()) return;

  const groupId = joinGroupByCode(code, displayName);
  if (groupId) {
    router.push({ pathname: '/group/[id]', params: { id: groupId } });
  }
}

export function GroupInviteLinkHandler() {
  const router = useRouter();
  const joinGroupByCode = useGroupExpenseStore((s) => s.joinGroupByCode);
  const displayName = useProfileStore((s) => s.name) || 'You';

  useEffect(() => {
    void Linking.getInitialURL().then((url) => {
      if (url) handleInviteUrl(url, joinGroupByCode, displayName, router);
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleInviteUrl(url, joinGroupByCode, displayName, router);
    });

    return () => subscription.remove();
  }, [joinGroupByCode, displayName, router]);

  return null;
}
