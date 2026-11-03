import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { getCableShop } from "@/lib/cableSync";
import { sendCableReminders } from "@/lib/cable";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseJsonBody } from "@/lib/validations/http";
import { cableRemindersSchema } from "@/lib/validations/cable";

// POST /api/cable/sms/reminders — SMS every subscriber who's expiring soon, expired or owing.
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const body = await parseJsonBody(request, cableRemindersSchema);
  if (body.error) return body.error;
  try {
    await getCableShop(auth.user, body.data.shopId, "MANAGE");
    const shop = await prisma.shop.findUnique({ where: { id: body.data.shopId }, select: { smsLanguage: true } });
    const result = await sendCableReminders(body.data.shopId, { provider: body.data.provider, language: shop?.smsLanguage === "ta" ? "ta" : "en" });
    return NextResponse.json(result);
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to send reminders");
  }
}
