import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { canAccessEntry, canRestoreEntry, restoreEntry } from "@/lib/recycleBin";
import { parseJsonBody } from "@/lib/validations/http";
import { recycleBinIdsSchema } from "@/lib/validations/recycleBin";

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  try {
    const parsed = await parseJsonBody(request, recycleBinIdsSchema);
    if (parsed.error) return parsed.error;
    const { ids } = parsed.data;

    const entries = await prisma.recycleBin.findMany({
      where: { id: { in: ids } }
    });

    let restored = 0;
    const failed: string[] = [];
    for (const entry of entries) {
      if (!canAccessEntry(entry, auth.user.id) || !(await canRestoreEntry(entry, auth.user))) {
        failed.push(entry.id);
        continue;
      }
      try {
        await restoreEntry(entry);
        restored++;
      } catch (e) {
        console.error("Failed to restore recycle bin entry:", entry.id, e);
        failed.push(entry.id);
      }
    }

    await prisma.systemLog.create({
      data: {
        action: "RECYCLE_BIN_BULK_RESTORE",
        details: `Restored ${restored} items from recycle bin`,
        userId: auth.user.id,
      }
    });

    return NextResponse.json({ success: failed.length === 0, restored, failed });
  } catch (error) {
    console.error("Failed to restore recycle bin items:", error);
    return NextResponse.json({ error: "Failed to restore items" }, { status: 500 });
  }
}
