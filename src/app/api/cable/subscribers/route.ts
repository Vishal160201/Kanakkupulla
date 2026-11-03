import { NextResponse } from "next/server";
import prisma, { toNumber } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { getCableShop } from "@/lib/cableSync";
import { subscriberDues } from "@/lib/cable";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseSearchParams } from "@/lib/validations/http";
import { cableShopQuery } from "@/lib/validations/cable";

export const dynamic = "force-dynamic";

// GET /api/cable/subscribers?shopId= — every subscriber of a cable shop with what they owe (filtered on the
// client), plus the sync / wallet status and the shop's WhatsApp details.
export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const query = parseSearchParams(request, cableShopQuery);
  if (query.error) return query.error;

  try {
    const shop = await getCableShop(auth.user, query.data.shopId);
    // shortcut: whole list in one response; page it on the server if a shop passes a few thousand subscribers
    const [subscribers, dues, openComplaints] = await Promise.all([
      prisma.cableSubscriber.findMany({
        where: { shopId: shop.id },
        orderBy: [{ expiresAt: "asc" }, { name: "asc" }],
        select: {
          id: true, provider: true, externalId: true, name: true, phone: true, status: true, plan: true,
          area: true, vcNumber: true, expiresAt: true, renewedAt: true, goneAt: true,
        },
      }),
      subscriberDues(prisma, shop.id),
      prisma.cableComplaint.groupBy({ by: ["subscriberId"], where: { shopId: shop.id, fixedAt: null }, _count: { _all: true } }),
    ]);
    const complaintsOf = new Map(openComplaints.map((c) => [c.subscriberId, c._count._all]));
    return NextResponse.json({
      subscribers: subscribers.map((s) => ({ ...s, due: dues.get(s.id) ?? 0, openComplaints: complaintsOf.get(s.id) ?? 0 })),
      syncedAt: shop.syncedAt,
      tcclSyncedAt: shop.tcclSyncedAt,
      hasSyncKey: !!shop.syncKeyHash,
      shop: {
        name: shop.name,
        upiId: shop.upiId,
        contactPhone: shop.contactPhone,
        walletBalance: shop.walletBalance === null ? null : toNumber(shop.walletBalance),
        walletSyncedAt: shop.walletSyncedAt,
        tcclWalletBalance: shop.tcclWalletBalance === null ? null : toNumber(shop.tcclWalletBalance),
        tcclWalletSyncedAt: shop.tcclWalletSyncedAt,
        lowWalletAlert: shop.lowWalletAlert === null ? null : toNumber(shop.lowWalletAlert),
        smsConfigured: !!shop.smsApiKey && !!shop.smsFrom,
        smsFrom: shop.smsFrom,
        smsAutoReminders: shop.smsAutoReminders,
        smsLanguage: shop.smsLanguage === "ta" ? "ta" : "en",
      },
    });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to load subscribers");
  }
}
