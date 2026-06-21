import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  const BOT_URL = process.env.WHATSAPP_BOT_URL || "http://localhost:3001";
  
  try {
    // Ping the bot server to keep it awake too
    await fetch(BOT_URL, { signal: AbortSignal.timeout(5000) }).catch(() => {});
  } catch (error) {
    // Ignore errors, we just want to wake it up
  }

  return NextResponse.json({ 
    status: "ok", 
    message: "Kanakkupulla is awake!",
    timestamp: new Date().toISOString()
  });
}
