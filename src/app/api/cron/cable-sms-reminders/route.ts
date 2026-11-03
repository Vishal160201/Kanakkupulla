import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyCronRequest } from "@/lib/authz";
import { sendCableReminders } from "@/lib/cable";

export const dynamic = "force-dynamic";

// GET /api/cron/cable-sms-reminders — daily: SMS reminders for every cable shop with auto-reminders on.
export async function GET(request: Request) {
  const denied = verifyCronRequest(request);
  if (denied) return denied;

  const shops = await prisma.shop.findMany({
    where: { type: "CABLE", isArchived: false, smsAutoReminders: true, smsApiKey: { not: null }, smsFrom: { not: null } },
    select: { id: true, name: true, smsLanguage: true },
  });
  const results = [];
  for (const shop of shops) {
    try {
      const r = await sendCableReminders(shop.id, { language: shop.smsLanguage === "ta" ? "ta" : "en" });
      results.push({ shop: shop.name, ...r });
    } catch (error) {
      results.push({ shop: shop.name, error: error instanceof Error ? error.message : "failed" });
    }
  }
  return NextResponse.json({ shops: shops.length, results });
}
