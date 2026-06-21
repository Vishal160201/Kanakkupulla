import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const BOT_URL = process.env.WHATSAPP_BOT_URL || "http://localhost:3001";
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;
  if (!session || (userRole !== "SUPER_ADMIN" && userRole !== "STUDIO_OWNER" && userRole !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(`${BOT_URL}/api/status`, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to connect to WhatsApp Bot Server:", error);
    return NextResponse.json({
      status: 'ERROR',
      error: "Could not connect to the standalone WhatsApp Bot Server. Please ensure it is running."
    });
  }
}
