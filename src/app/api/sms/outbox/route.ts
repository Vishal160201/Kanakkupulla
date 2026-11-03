import { NextResponse } from "next/server";
import { claimOutbox, reportOutbox, shopForDeviceToken } from "@/lib/sms";
import { parseJsonBody } from "@/lib/validations/http";
import { outboxReportSchema } from "@/lib/validations/cable";

export const dynamic = "force-dynamic";

const tokenOf = (request: Request) => request.headers.get("authorization")?.match(/^Bearer (\S+)$/)?.[1];
const unauthorized = () => NextResponse.json({ error: "Invalid or revoked device token." }, { status: 401 });

// GET /api/sms/outbox — the sender app polls (Bearer device token) for pending SMS to send.
export async function GET(request: Request) {
  const token = tokenOf(request);
  const shop = token ? await shopForDeviceToken(token) : null;
  if (!shop) return unauthorized();
  const messages = await claimOutbox(shop.id);
  return NextResponse.json({ messages });
}

// POST /api/sms/outbox — the app reports one message as sent or failed.
export async function POST(request: Request) {
  const token = tokenOf(request);
  const shop = token ? await shopForDeviceToken(token) : null;
  if (!shop) return unauthorized();
  const body = await parseJsonBody(request, outboxReportSchema);
  if (body.error) return body.error;
  await reportOutbox(shop.id, body.data.id, body.data.ok, body.data.reason);
  return NextResponse.json({ ok: true });
}
