import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    // Optional: protect cron route with a secret key if needed
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return new Response('Unauthorized', { status: 401 });
    // }

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
      if (entry.itemType === "booking") {
        try {
          await prisma.booking.delete({ where: { id: entry.itemId } });
        } catch (e) {}
      } else if (entry.itemType === "product-order" || entry.itemType === "gift" || entry.itemType === "frame") {
        try {
          await prisma.productOrder.delete({ where: { id: entry.itemId } });
        } catch (e) {}
      }

      await prisma.recycleBin.delete({ where: { id: entry.id } });
      purgedCount++;
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
    console.error("Error purging recycle bin:", error);
    return NextResponse.json({ error: "Failed to purge recycle bin" }, { status: 500 });
  }
}
