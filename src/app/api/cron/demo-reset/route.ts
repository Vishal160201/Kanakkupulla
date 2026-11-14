import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/authz";
import { isDemoServer } from "@/lib/demo/mode";
import { DemoResetRefused, resetDemo } from "@/lib/demo/reset";
import { seedDemo } from "@/lib/demo/seed";

export const maxDuration = 300;

/** GET /api/cron/demo-reset — nightly: the demo site goes back to its sample data. Does nothing elsewhere. */
export async function GET(request: Request) {
  if (!isDemoServer()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const denied = verifyCronRequest(request);
  if (denied) return denied;
  const origin = (process.env.NEXTAUTH_URL || new URL(request.url).origin).replace(/\/$/, "");
  try {
    const counts = await resetDemo(origin, seedDemo);
    return NextResponse.json({ ok: true, counts });
  } catch (error) {
    if (error instanceof DemoResetRefused) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("[demo-reset] failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Demo reset failed" }, { status: 500 });
  }
}
