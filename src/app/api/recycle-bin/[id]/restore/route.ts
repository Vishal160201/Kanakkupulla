import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { canAccessEntry, canRestoreEntry, restoreEntry } from "@/lib/recycleBin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  try {
    const id = (await params).id;
    const entry = await prisma.recycleBin.findUnique({ where: { id } });

    if (!entry || !canAccessEntry(entry, auth.user.id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!(await canRestoreEntry(entry, auth.user))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await restoreEntry(entry);

    await prisma.systemLog.create({
      data: {
        action: "RECYCLE_BIN_RESTORE",
        details: `Restored item ${id} from recycle bin`,
        userId: auth.user.id,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to restore item:", error);
    return NextResponse.json({ error: "Failed to restore item" }, { status: 500 });
  }
}
