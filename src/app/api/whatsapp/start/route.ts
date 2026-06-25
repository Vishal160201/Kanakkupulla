import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST() {
  const BOT_URL = process.env.WHATSAPP_BOT_URL;
  if (!BOT_URL) {
    return NextResponse.json({ error: "WHATSAPP_BOT_URL is not configured" }, { status: 500 });
  }

  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;
  if (!session || (userRole !== "SUPER_ADMIN" && userRole !== "STUDIO_OWNER" && userRole !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Render apps are always-on once deployed, or they wake up on the first request.
    // We just hit the root endpoint to trigger a wake-up if it's sleeping.
    const res = await fetch(`${BOT_URL}/`, { 
      cache: 'no-store',
      signal: AbortSignal.timeout(60000)
    });
    
    if (res.ok) {
      return NextResponse.json({ success: true, message: "Bot server is awake and running." });
    } else {
      return NextResponse.json({ error: "Bot server responded with an error." }, { status: res.status });
    }
  } catch (error: any) {
    console.error("Failed to start/wake WhatsApp Bot Server:", error);
    
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      return NextResponse.json({
        error: "Connection timed out. The bot server is taking too long to wake up."
      }, { status: 504 });
    }

    return NextResponse.json({
      error: "Could not connect to the WhatsApp Bot Server."
    }, { status: 500 });
  }
}
