import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { botFetch } from "@/lib/whatsappBot";

export async function POST() {
  if (!process.env.WHATSAPP_BOT_URL) {
    return NextResponse.json({ error: "WHATSAPP_BOT_URL is not configured" }, { status: 500 });
  }

  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    // Render apps are always-on once deployed, or they wake up on the first request.
    // We just hit the root endpoint to trigger a wake-up if it's sleeping.
    const res = await botFetch("/", {
      signal: AbortSignal.timeout(60000)
    });
    
    if (res.ok) {
      return NextResponse.json({ success: true, message: "Bot server is awake and running." });
    } else {
      return NextResponse.json({ error: "Bot server responded with an error." }, { status: res.status });
    }
  } catch (error) {
    console.error("WhatsApp bot wake-up failed:", error);
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      return NextResponse.json({
        error: "Connection timed out. The bot server is taking too long to wake up."
      }, { status: 504 });
    }

    return NextResponse.json({
      error: "Could not connect to the WhatsApp Bot Server."
    }, { status: 500 });
  }
}
