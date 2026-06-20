import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { disconnectWhatsApp } from "@/lib/whatsapp";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["STUDIO_OWNER", "ADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await disconnectWhatsApp();

  return NextResponse.json({ success: true });
}
