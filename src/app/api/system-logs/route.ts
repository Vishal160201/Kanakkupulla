import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { parseSearchParams } from "@/lib/validations/http";
import { systemLogQuerySchema } from "@/lib/validations/admin";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const query = parseSearchParams(request, systemLogQuerySchema);
  if (query.error) return query.error;
  const { limit, action } = query.data;

  try {
    const logs = await prisma.systemLog.findMany({
      where: action ? { action } : {},
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(logs, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Failed to fetch system logs:", error);
    return NextResponse.json({ error: "Failed to fetch system logs" }, { status: 500 });
  }
}
