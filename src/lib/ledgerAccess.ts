import { can, isOwner, type SessionUser } from "@/lib/authz";
import type { ModuleKey } from "@/lib/access";
import { getAccessibleShop, ShopError } from "@/lib/shops";

/**
 * Who may read a ledger: Daily Kanakku VIEW in that shop (or one of `alsoAllow` modules, e.g.
 * bookings for booking-linked payments). Without a shop ("All Shops") only owners may read.
 */
export async function assertLedgerReadable(
  user: SessionUser,
  shopId: string | null | undefined,
  alsoAllow: ModuleKey[] = []
) {
  if (!shopId) {
    if (isOwner(user)) return;
    for (const extra of alsoAllow) if (await can(user, extra, "VIEW")) return;
    throw new ShopError("Pick a shop to view its Daily Kanakku.", 422);
  }
  await getAccessibleShop(user, shopId);
  if (await can(user, "ledger", "VIEW", shopId)) return;
  for (const extra of alsoAllow) if (await can(user, extra, "VIEW")) return;
  throw new ShopError("You don't have permission to view this shop's Daily Kanakku.", 403);
}
