import { NextResponse } from "next/server";
import prisma, { toNumber } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { addMonthlyCharges, getCableShop } from "@/lib/cableSync";
import { subscriberDues } from "@/lib/cable";
import { toMonth } from "@/lib/cableMonthly";
import { isDeviceConnected } from "@/lib/sms";
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
    // A new month's charges, if no sync has added them yet (the extension isn't running)
    if (shop.cableMonthlyFee !== null && shop.cableBillingFrom && shop.cableBilledMonth !== toMonth(new Date())) await prisma.$transaction((tx) => addMonthlyCharges(tx, shop.id));
    // shortcut: whole list in one response; page it on the server if a shop passes a few thousand subscribers
    const month = toMonth(new Date());
    const [subscribers, dues, openComplaints, collected] = await Promise.all([
      prisma.cableSubscriber.findMany({
        where: { shopId: shop.id },
        orderBy: [{ expiresAt: "asc" }, { name: "asc" }],
        select: {
          id: true, provider: true, externalId: true, name: true, phone: true, status: true, plan: true,
          area: true, vcNumber: true, expiresAt: true, renewedAt: true, goneAt: true,
          // Not shown in the list, only searched
          tamilName: true, oldVcNumber: true, altPhone: true, macId: true, address: true, groupName: true,
          nodeHouse: true, monthlyFee: true,
        },
      }),
      subscriberDues(prisma, shop.id),
      prisma.cableComplaint.groupBy({ by: ["subscriberId"], where: { shopId: shop.id, fixedAt: null }, _count: { _all: true } }),
      // Cable TV money collected this month (India time), set against what goes to TCCL on the 15th
      prisma.cablePayment.aggregate({ where: { shopId: shop.id, voidedAt: null, subscriber: { provider: "TCCL" }, date: { gte: new Date(`${month}-01T00:00:00+05:30`) } }, _sum: { amount: true } }),
    ]);
    const complaintsOf = new Map(openComplaints.map((c) => [c.subscriberId, c._count._all]));
    return NextResponse.json({
      subscribers: subscribers.map((s) => ({ ...s, monthlyFee: s.monthlyFee === null ? null : toNumber(s.monthlyFee), due: dues.get(s.id) ?? 0, openComplaints: complaintsOf.get(s.id) ?? 0 })),
      syncedAt: shop.syncedAt,
      tcclSyncedAt: shop.tcclSyncedAt,
      hasSyncKey: !!shop.syncKeyHash,
      tcclMonth: { month, billed: shop.tcclBillMonth === month ? toNumber(shop.tcclBillAmount) : 0, collected: toNumber(collected._sum.amount) },
      shop: {
        name: shop.name,
        upiId: shop.upiId,
        contactPhone: shop.contactPhone,
        walletBalance: shop.walletBalance === null ? null : toNumber(shop.walletBalance),
        walletSyncedAt: shop.walletSyncedAt,
        tcclWalletBalance: shop.tcclWalletBalance === null ? null : toNumber(shop.tcclWalletBalance),
        tcclWalletSyncedAt: shop.tcclWalletSyncedAt,
        lowWalletAlert: shop.lowWalletAlert === null ? null : toNumber(shop.lowWalletAlert),
        cableMonthlyFee: shop.cableMonthlyFee === null ? null : toNumber(shop.cableMonthlyFee),
        cableNodeFee: shop.cableNodeFee === null ? null : toNumber(shop.cableNodeFee),
        smsConfigured: !!shop.smsDeviceTokenHash && !!shop.smsFrom,
        smsPaired: !!shop.smsDeviceTokenHash,
        smsDeviceSeenAt: shop.smsDeviceSeenAt,
        smsConnected: !!shop.smsDeviceTokenHash && isDeviceConnected(shop.smsDeviceSeenAt),
        smsFrom: shop.smsFrom,
        smsAutoReminders: shop.smsAutoReminders,
        smsLanguage: shop.smsLanguage === "ta" ? "ta" : "en",
      },
    });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to load subscribers");
  }
}
