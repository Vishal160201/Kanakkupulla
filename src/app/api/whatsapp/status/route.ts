import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getWhatsAppStatus, initWhatsApp } from "@/lib/whatsapp";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["STUDIO_OWNER", "ADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Trigger initialization if it hasn't started
  initWhatsApp();

  const status = getWhatsAppStatus();
  return NextResponse.json(status);
}
