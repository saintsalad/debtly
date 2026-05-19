import { parseInviteCodeFromLinkOrRaw } from '@/features/group-expense/joinLinkParse';

/**
 * Resolve invite link or raw token to a group id: Convex join when enabled (and caller supplies
 * `convexJoin`), then legacy local short-code join on failure or when Convex is unavailable.
 */
export async function joinSplitGroupFromInvite(params: {
  rawCodeOrLink: string;
  /** Used only for local legacy groups (Convex join uses the signed-in profile name). */
  displayName: string;
  preferConvex: boolean;
  convexJoin?: (code: string) => Promise<{ groupId: string }>;
  localJoin: (code: string, displayName: string) => string | null;
}): Promise<{ groupId: string } | null> {
  const code = parseInviteCodeFromLinkOrRaw(params.rawCodeOrLink);
  if (!code) return null;

  if (params.preferConvex && params.convexJoin) {
    try {
      const r = await params.convexJoin(code);
      return { groupId: r.groupId };
    } catch {
      // Invalid cloud invite or offline — try on-device groups with matching invite code.
    }
  }

  const trimmedName = params.displayName.trim() || 'Guest';
  const gid = params.localJoin(code, trimmedName);
  return gid ? { groupId: gid } : null;
}
