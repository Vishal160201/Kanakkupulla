"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useShops } from "@/components/providers/ShopProvider";
import { useAccess, useActiveShopCan } from "@/hooks/useAccess";
import { isPathAllowedForShopType, landingPathForShopType, moduleForPath } from "@/lib/shopModules";
import { accessModuleForPath, firstViewablePath } from "./moduleAccess";
import Loading from "@/app/(main)/loading";

/**
 * Keeps the page in step with the active shop and the user's permissions. Once shops
 * and access have loaded, a path the active shop type doesn't have (e.g. /bookings in
 * a fertilizer shop) or whose module the user can't view there is replaced by the
 * first page they can view (the type's landing page when allowed; /settings if
 * nothing is viewable). Before that, the provider assumes the stored shop's type and
 * access answers optimistically for it, so allowed pages render (and fetch) straight
 * away while others are held back; a disallowed page never flashes. Settings is open
 * to everyone (it shows each user only their own sections).
 */
export default function ShopRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const { activeShopType, allowedModules, isReady } = useShops();
  const { isLoading: isAccessLoading } = useAccess();
  const can = useActiveShopCan();

  const isSettings = moduleForPath(pathname) === "settings";
  const accessModule = accessModuleForPath(pathname);
  const isAllowed =
    isSettings ||
    (isPathAllowedForShopType(pathname, activeShopType) && (accessModule === null || can(accessModule, "VIEW")));
  const mustRedirect = isReady && !isAccessLoading && !isAllowed;

  const landing = landingPathForShopType(activeShopType);
  const landingModule = accessModuleForPath(landing);
  const target = landingModule && can(landingModule, "VIEW") ? landing : firstViewablePath(can, allowedModules);

  useEffect(() => {
    if (mustRedirect && pathname !== target) router.replace(target);
  }, [mustRedirect, pathname, target, router]);

  // Not allowed: redirecting (once ready) or waiting to learn the real shop type / access.
  if (!isAllowed) return <Loading />;
  return <>{children}</>;
}
