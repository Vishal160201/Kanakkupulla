import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const BOT_URL = process.env.WHATSAPP_BOT_URL || "http://localhost:3001";

export async function POST() {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;
  if (!session || (userRole !== "SUPER_ADMIN" && userRole !== "STUDIO_OWNER" && userRole !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await fetch(`${BOT_URL}/api/logout`, { method: 'POST' });
  } catch (error) {
    console.error("Failed to disconnect from external bot server:", error);
  }

  return NextResponse.json({ success: true });
}
