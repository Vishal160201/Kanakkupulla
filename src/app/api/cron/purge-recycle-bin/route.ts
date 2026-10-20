import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyCronRequest } from "@/lib/authz";
import { purgeEntry } from "@/lib/recycleBin";

export async function GET(request: Request) {
  const denied = verifyCronRequest(request);
  if (denied) return denied;

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const entriesToPurge = await prisma.recycleBin.findMany({
      where: {
        trashedAt: {
          lt: thirtyDaysAgo
        }
      }
    });

    let purgedCount = 0;

    for (const entry of entriesToPurge) {
      try {
        await purgeEntry(entry);
        purgedCount++;
      } catch (e) {
        console.error("Failed to purge recycle bin entry:", entry.id, e);
      }
    }

    if (purgedCount > 0) {
      await prisma.systemLog.create({
        data: {
          action: "CRON_PURGE_RECYCLE_BIN",
          details: `Automatically purged ${purgedCount} items older than 30 days`,
          userId: null,
        }
      });
    }

    return NextResponse.json({ success: true, purgedCount });
  } catch (error) {
    console.error("Failed to purge recycle bin:", error);
    return NextResponse.json({ error: "Failed to purge recycle bin" }, { status: 500 });
  }
}
