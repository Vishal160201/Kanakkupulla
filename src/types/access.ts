// What the signed-in user may do, as returned by GET /api/me/access.

import type { PermissionMap, RoleKey } from "@/lib/access";
import type { ShopType } from "@/types/shops";

/** One shop the member is assigned to, with the role they hold there. */
export interface ShopAccess {
  shopId: string;
  shopName: string;
  shopType: ShopType;
  roleKey: RoleKey;
  /** Display name of the role, e.g. "Admin". */
  roleName: string;
  permissions: PermissionMap;
}

/** GET /api/me/access */
export interface MeAccessResponse {
  isOwner: boolean;
  /** Studio-wide levels: for studio modules, the highest level across the member's studio shops. */
  studio: PermissionMap;
  /** Owners get an empty list (they can use every shop). */
  shops: ShopAccess[];
}
