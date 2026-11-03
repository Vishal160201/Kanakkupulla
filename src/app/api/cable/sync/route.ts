import { NextResponse } from "next/server";
import { applySubscriberSync, shopForSyncKey, tcclRowToSubscriber, ticRowToSubscriber } from "@/lib/cableSync";
import { parseJsonBody } from "@/lib/validations/http";
import { cableSyncSchema } from "@/lib/validations/cable";

export const dynamic = "force-dynamic";

// POST /api/cable/sync — called every minute (and on "Sync now") by the Kanakkupulla browser extension with
// `Authorization: Bearer <shop sync key>` and the whole subscriber list of one portal (TIC Fiber or TCCL).
export async function POST(request: Request) {
  const key = request.headers.get("authorization")?.match(/^Bearer (\S+)$/)?.[1];
  const shop = key ? await shopForSyncKey(key) : null;
  if (!shop) return NextResponse.json({ error: "Sync key is wrong or was replaced. Copy a new one from Subscribers → Sync setup." }, { status: 401 });

  const body = await parseJsonBody(request, cableSyncSchema);
  if (body.error) return body.error;

  const toSubscriber = body.data.provider === "TCCL" ? tcclRowToSubscriber : ticRowToSubscriber;
  const subscribers = body.data.rows.map(toSubscriber).filter((s) => s !== null);
  // An empty report is far likelier a portal glitch than every subscriber leaving; don't mark them all gone.
  if (subscribers.length === 0) return NextResponse.json({ error: "The report had no subscribers, so nothing was changed." }, { status: 422 });

  try {
    const result = await applySubscriberSync(shop.id, body.data.provider, subscribers, body.data.wallet ?? null);
    return NextResponse.json({ ok: true, received: subscribers.length, ...result });
  } catch (error) {
    console.error("Cable sync failed:", error);
    return NextResponse.json({ error: "Sync failed. It will retry on the next run." }, { status: 500 });
  }
}
