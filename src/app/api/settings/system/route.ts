import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Default settings if none exist in the database
const DEFAULT_SETTINGS = {
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
  }
};

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await prisma.systemSetting.findMany();
    
    // Convert array of settings into a key-value map
    const settingsMap: Record<string, any> = {};
    
    // Seed defaults if missing
    for (const [key, defaultValue] of Object.entries(DEFAULT_SETTINGS)) {
      const existing = settings.find(s => s.key === key);
      if (existing) {
        settingsMap[key] = existing.value;
      } else {
        // Create the default in DB
        const created = await prisma.systemSetting.create({
          data: { key, value: defaultValue }
        });
        settingsMap[key] = created.value;
      }
    }

    return NextResponse.json(settingsMap);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  if ((session.user as any).role !== "ADMIN") {
     return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 422 });
    }

    const updatedSetting = await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });

    return NextResponse.json(updatedSetting);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update setting" }, { status: 500 });
  }
}
