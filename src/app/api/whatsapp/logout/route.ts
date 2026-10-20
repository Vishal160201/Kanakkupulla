import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { botFetch } from "@/lib/whatsappBot";

export async function POST() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const res = await botFetch("/api/logout", { method: "POST" });
    if (!res.ok) {
      return NextResponse.json({ error: "Bot server rejected the logout request." }, { status: 502 });
    }
  } catch (error) {
    console.error("WhatsApp bot logout failed:", error);
    return NextResponse.json({ error: "Could not connect to the WhatsApp Bot Server." }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
