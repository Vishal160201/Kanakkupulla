import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET() {
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
    const res = await fetch(`${BOT_URL}/`, { 
      cache: 'no-store',
      signal: AbortSignal.timeout(60000)
    });
    
    if (!res.ok) {
    }

    try {
      const data = await res.json();
      return NextResponse.json(data);
    } catch (parseError) {
      return NextResponse.json({ 
        connected: false, 
        status: 'ERROR',
        error: 'Bot returned HTML — wrong endpoint or server error' 
      });
    }
  } catch (error: any) {
    
    // If it was a timeout, it might be Render cold starting
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
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
