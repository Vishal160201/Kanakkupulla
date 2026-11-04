import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { getCableShop } from "@/lib/cableSync";
import { hashDeviceToken, newDeviceToken } from "@/lib/sms";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseJsonBody } from "@/lib/validations/http";
import { cableShopBody } from "@/lib/validations/cable";

// POST /api/cable/sms/pair — issue a device token for the SMS sender app (old one stops working).
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const body = await parseJsonBody(request, cableShopBody);
  if (body.error) return body.error;
  try {
    const shop = await getCableShop(auth.user, body.data.shopId, "MANAGE");
    const token = newDeviceToken();
    await prisma.shop.update({ where: { id: shop.id }, data: { smsDeviceTokenHash: hashDeviceToken(token), smsDeviceSeenAt: null, smsDeviceId: null } });
    return NextResponse.json({ token });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to pair the phone");
  }
}
