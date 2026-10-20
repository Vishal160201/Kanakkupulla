import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  const BOT_URL = process.env.WHATSAPP_BOT_URL || "http://localhost:3001";
  
  // Ping the bot server to keep it awake too; failures don't matter, we just want to wake it up
  await fetch(BOT_URL, { signal: AbortSignal.timeout(5000) }).catch(() => undefined);

  return NextResponse.json({ 
    status: "ok", 
    message: "Kanakkupulla is awake!",
    timestamp: new Date().toISOString()
  });
}
