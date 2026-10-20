import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { botFetch } from "@/lib/whatsappBot";

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!process.env.WHATSAPP_BOT_URL) {
    return NextResponse.json({ error: "WHATSAPP_BOT_URL is not configured" }, { status: 500 });
  }

  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const res = await botFetch("/api/status", {
      signal: AbortSignal.timeout(60000)
    });

    if (!res.ok) {
      return NextResponse.json({
        connected: false,
        status: 'ERROR',
        error: res.status === 401 || res.status === 503
          ? 'Bot server rejected the request. Check WHATSAPP_BOT_SECRET on both servers.'
          : `Bot server responded with ${res.status}`
      });
    }

    return NextResponse.json(await res.json());
  } catch (error) {
    console.error("WhatsApp bot status check failed:", error);
    // If it was a timeout, it might be Render cold starting
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      return NextResponse.json({
        status: 'ERROR',
        error: "Connection timed out. The bot server might be waking up from sleep (can take up to 60s)."
      });
    }

    return NextResponse.json({
      status: 'ERROR',
      error: "Could not connect to the standalone WhatsApp Bot Server. Please ensure it is running."
    });
  }
}
