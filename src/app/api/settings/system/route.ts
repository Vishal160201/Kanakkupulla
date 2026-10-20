import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/authz";
import { parseJsonBody } from "@/lib/validations/http";
import { systemSettingSchema } from "@/lib/validations/settings";

export const dynamic = "force-dynamic";

// Default settings if none exist in the database
const DEFAULT_SETTINGS: Record<string, Prisma.InputJsonObject> = {
  UI_PREFERENCES: {
    currencySymbol: "₹",
    hotDateThreshold: 50000,
    calendarTiers: [
      { max: 20000, bg: "#ffedd5", text: "#ea580c" }, // Basic
      { max: 30000, bg: "#fdba74", text: "#7c2d12" }, // Standard
      { max: 50000, bg: "#f97316", text: "#ffffff" }, // Premium
      { max: 9999999, bg: "#c2410c", text: "#ffffff" }, // Elite
    ],
    statusColors: {
      "Confirmed": { bg: "#10b981", text: "#047857" }, // Emerald
      "Pending": { bg: "#ef4444", text: "#b91c1c" }, // Red
      "Partial": { bg: "#f97316", text: "#c2410c" }, // Orange
      "Completed": { bg: "#3b82f6", text: "#1d4ed8" }, // Blue
      "Cancelled": { bg: "#64748b", text: "#334155" }, // Slate
    }
  },
  BANNER_SETTINGS: {
    bannerEnabled: true,
    bannerTime1: "09:00",
    bannerTime2: "17:00"
  }
};

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  try {
    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: Object.keys(DEFAULT_SETTINGS) } },
      select: { key: true, value: true },
    });

    // Convert array of settings into a key-value map
    const settingsMap: Record<string, Prisma.JsonValue | Prisma.InputJsonObject> = {};
    const missing: { key: string; value: Prisma.InputJsonObject }[] = [];

    for (const [key, defaultValue] of Object.entries(DEFAULT_SETTINGS)) {
      const existing = settings.find(s => s.key === key);
      if (existing) {
        settingsMap[key] = existing.value;
      } else {
        missing.push({ key, value: defaultValue });
        settingsMap[key] = defaultValue;
      }
    }

    // Seed defaults if missing
    if (missing.length > 0) {
      await prisma.systemSetting.createMany({ data: missing, skipDuplicates: true });
    }

    return NextResponse.json(settingsMap);
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const parsed = await parseJsonBody(request, systemSettingSchema);
    if (parsed.error) return parsed.error;
    const { key } = parsed.data;
    const value = parsed.data.value as Prisma.InputJsonValue; // null is rejected by the schema

    const updatedSetting = await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });

    return NextResponse.json(updatedSetting);
  } catch (error) {
    console.error("Failed to update setting:", error);
    return NextResponse.json({ error: "Failed to update setting" }, { status: 500 });
  }
}
