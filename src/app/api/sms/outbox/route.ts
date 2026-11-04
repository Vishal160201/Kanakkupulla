import { NextResponse } from "next/server";
import { claimOutbox, recentOutbox, reportOutbox, shopForDevice } from "@/lib/sms";
import { parseJsonBody } from "@/lib/validations/http";
import { outboxReportSchema } from "@/lib/validations/cable";

export const dynamic = "force-dynamic";

const tokenOf = (request: Request) => request.headers.get("authorization")?.match(/^Bearer (\S+)$/)?.[1];
const deviceOf = (request: Request) => request.headers.get("x-device-id")?.trim().slice(0, 64) || null;
const unauthorized = () => NextResponse.json({ error: "Invalid or revoked device token." }, { status: 401 });

/** The paired shop for this request, or the error response (bad token → 401, a second phone → 409). */
async function authorize(request: Request) {
  const token = tokenOf(request);
  if (!token) return { error: unauthorized() };
  const result = await shopForDevice(token, deviceOf(request));
  if (result.error === "token") return { error: unauthorized() };
  if (result.error === "device") return { error: NextResponse.json({ error: "Another phone is already connected. Re-pair in Kanakkupulla to switch phones." }, { status: 409 }) };
  return { shop: result.shop };
}

// GET /api/sms/outbox — the sender app polls (Bearer device token + X-Device-Id) for pending SMS to send.
export async function GET(request: Request) {
  const auth = await authorize(request);
  if (auth.error) return auth.error;
  const messages = await claimOutbox(auth.shop.id);
  const recent = await recentOutbox(auth.shop.id);
  return NextResponse.json({ messages, recent });
}

// POST /api/sms/outbox — the app reports one message as sent or failed.
export async function POST(request: Request) {
  const auth = await authorize(request);
  if (auth.error) return auth.error;
  const body = await parseJsonBody(request, outboxReportSchema);
  if (body.error) return body.error;
  await reportOutbox(auth.shop.id, body.data.id, body.data.ok, body.data.reason);
  return NextResponse.json({ ok: true });
}
