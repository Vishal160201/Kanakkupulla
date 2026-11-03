import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { updateCableSettings } from "@/lib/cable";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseJsonBody } from "@/lib/validations/http";
import { cableSettingsSchema } from "@/lib/validations/cable";

// PATCH /api/cable/settings — UPI ID and phone for WhatsApp messages, low-wallet warning level.
export async function PATCH(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const body = await parseJsonBody(request, cableSettingsSchema);
  if (body.error) return body.error;
  try {
    const { shopId, ...input } = body.data;
    return NextResponse.json(await updateCableSettings(auth.user, shopId, input));
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to save settings");
  }
}
