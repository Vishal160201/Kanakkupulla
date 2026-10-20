import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { canAccessEntry, purgeEntry } from "@/lib/recycleBin";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  // Drive deletes run as the acting admin
  const session = { user: auth.user };

  try {
    const id = (await params).id;
    const entry = await prisma.recycleBin.findUnique({ where: { id } });
    if (!entry || !canAccessEntry(entry, auth.user.id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await purgeEntry(entry, session);

    await prisma.systemLog.create({
      data: {
        action: "RECYCLE_BIN_DELETE",
        details: `Permanently deleted item ${id} from recycle bin`,
        userId: auth.user.id,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete item:", error);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
