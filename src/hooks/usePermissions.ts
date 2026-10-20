"use client";

import { useSession } from "next-auth/react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { DEFAULT_MATRIX, isPermission, isRole } from "@/lib/permissions";

/** A role/permission override row from /api/permissions. */
interface PermissionOverride {
  role: string;
  permission: string;
  enabled: boolean;
}

export function usePermissions() {
  const { data: session, status } = useSession();
  
  const { data: dbPermissions } = useSWR<PermissionOverride[]>(
    status === "authenticated" ? '/api/permissions' : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const checkPermission = (action: string) => {
    const role = session?.user?.role || "STAFF";
    
    // Check if we have overrides from the DB
    if (dbPermissions && Array.isArray(dbPermissions)) {
      const override = dbPermissions.find(p => p.role === role && p.permission === action);
      if (override) {
        return override.enabled;
      }
    }
    
    // Fallback to default matrix synchronously (prevents layout shift on load)
    if (isRole(role) && isPermission(action)) {
      return DEFAULT_MATRIX[role][action];
    }
    
    return false;
  };

  return { checkPermission };
}
