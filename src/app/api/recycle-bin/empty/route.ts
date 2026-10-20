import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { PRIVATE_ITEM_TYPES, purgeEntry } from "@/lib/recycleBin";

export async function POST() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  // Drive deletes run as the acting admin
  const session = { user: auth.user };

  try {
    // Other users' private entries are left alone
    const entries = await prisma.recycleBin.findMany({
      where: { OR: [{ itemType: { notIn: PRIVATE_ITEM_TYPES } }, { trashedById: auth.user.id }] },
    });

    for (const entry of entries) {
      await purgeEntry(entry, session);
    }

    await prisma.systemLog.create({
      data: {
        action: "RECYCLE_BIN_EMPTY",
        details: `Emptied recycle bin containing ${entries.length} items`,
        userId: auth.user.id,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to empty recycle bin:", error);
    return NextResponse.json({ error: "Failed to empty recycle bin" }, { status: 500 });
  }
}
