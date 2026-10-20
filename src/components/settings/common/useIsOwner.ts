"use client";

import { useAccess } from "@/hooks/useAccess";
import { levelAtLeast, type AccessLevel } from "@/lib/access";

/**
 * Owner check for the Settings area. Owners have full access to every shop and setting.
 * `isLoading` stays true until the user's access is known, so callers can avoid flashing
 * an "owners only" state (or owner-only content) during hydration.
 */
export function useIsOwner(): { isOwner: boolean; isLoading: boolean } {
  const { isOwner, isLoading } = useAccess();
  return { isOwner, isLoading };
}

/**
 * Recycle Bin access. The bin holds items of every shop, so a member qualifies through the
 * studio-wide level or their role in any assigned shop. Permanent deletes are owner-only.
 */
export function useRecycleBinAccess(): { canView: boolean; canRestore: boolean; canDelete: boolean; isLoading: boolean } {
  const { isOwner, isLoading, access } = useAccess();
  const has = (level: AccessLevel) =>
    isOwner ||
    levelAtLeast(access?.studio.recycle_bin, level) ||
    (access?.shops ?? []).some((s) => levelAtLeast(s.permissions.recycle_bin, level));
  return { canView: has("VIEW"), canRestore: has("MANAGE"), canDelete: isOwner, isLoading };
}
