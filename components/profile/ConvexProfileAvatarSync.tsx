import { useEffect } from 'react';
import { useConvexAuth, useQuery } from 'convex/react';

import { api } from '@/convex/_generated/api';
import { useProfileStore } from '@/stores/profileStore';

/**
 * Pulls `users.image` from Convex when signed in so profile avatar stays in sync across devices.
 * Does not overwrite a pending local `file://` avatar (mid-upload / before cloud finalize).
 */
export function ConvexProfileAvatarSync() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const viewer = useQuery(
    api.profile.viewer,
    isAuthenticated && !isLoading ? {} : 'skip'
  );

  const avatarUri = useProfileStore((s) => s.avatarUri);

  useEffect(() => {
    const remote = viewer?.image;
    if (!remote || typeof remote !== 'string') return;
    if (avatarUri?.startsWith('file')) return;
    if (remote === avatarUri) return;
    useProfileStore.getState().setAvatarUri(remote);
  }, [viewer?.image, avatarUri]);

  return null;
}
