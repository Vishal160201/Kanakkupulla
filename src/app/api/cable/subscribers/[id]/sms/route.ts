import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { getCableShop } from "@/lib/cableSync";
import { getShopGateway, sendSms } from "@/lib/sms";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseJsonBody, parseParams } from "@/lib/validations/http";
import { idParams } from "@/lib/validations/common";
import { cableSmsSchema } from "@/lib/validations/cable";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/cable/subscribers/[id]/sms — send one SMS to the subscriber through the shop's httpSMS gateway.
export async function POST(request: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const route = parseParams(await params, idParams);
  if (route.error) return route.error;
  const body = await parseJsonBody(request, cableSmsSchema);
  if (body.error) return body.error;
  try {
    const subscriber = await prisma.cableSubscriber.findUnique({ where: { id: route.data.id }, select: { shopId: true, phone: true } });
    if (!subscriber) return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
    await getCableShop(auth.user, subscriber.shopId, "MANAGE");
    const gateway = await getShopGateway(subscriber.shopId);
    await sendSms(gateway, subscriber.phone ?? "", body.data.text);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to send the SMS");
  }
}
