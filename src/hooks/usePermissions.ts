"use client";

import { useSession } from "next-auth/react";
import useSWR from "swr";

const DEFAULT_MATRIX: Record<string, Record<string, boolean>> = {
  ADMIN: {
    manage_bookings: true,
    view_transactions: true,
    manage_transactions: true,
    view_analytics: true,
    manage_users: true,
    view_galleries: true,
    manage_galleries: true,
    view_export_analytics: true,
  },
  STAFF: {
    manage_bookings: true,
    view_transactions: true,
    manage_transactions: false,
    view_analytics: true,
    manage_users: false,
    view_galleries: true,
    manage_galleries: false,
    view_export_analytics: false,
  },
  PHOTOGRAPHER: {
    manage_bookings: false,
    view_transactions: false,
    manage_transactions: false,
    view_analytics: false,
    manage_users: false,
    view_galleries: true,
    manage_galleries: true,
    view_export_analytics: false,
  },
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function usePermissions() {
  const { data: session, status } = useSession();
  
  const { data: dbPermissions } = useSWR(
    status === "authenticated" ? '/api/permissions' : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const checkPermission = (action: string) => {
    const role = (session?.user as any)?.role || "STAFF";
    
    // Check if we have overrides from the DB
    if (dbPermissions && Array.isArray(dbPermissions)) {
      const override = dbPermissions.find(p => p.role === role && p.permission === action);
      if (override) {
        return override.enabled;
      }
    }
    
    // Fallback to default matrix synchronously (prevents layout shift on load)
    if (DEFAULT_MATRIX[role] && typeof DEFAULT_MATRIX[role][action] === "boolean") {
      return DEFAULT_MATRIX[role][action];
    }
    
    return false;
  };

  return { checkPermission };
}
