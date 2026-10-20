import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/authz";
import { getOwnerNotifications, listRoles } from "@/lib/roles";

export const dynamic = "force-dynamic";

// GET /api/roles — Admin / Staff grids and alert switches, plus the owners' alert switches. Owner only.
export async function GET() {
  const auth = await requireOwner();
  if (auth.error) return auth.error;
  try {
    const [roles, ownerNotifications] = await Promise.all([listRoles(), getOwnerNotifications()]);
    return NextResponse.json({ roles, owner: { notifications: ownerNotifications } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Failed to load roles:", error);
    return NextResponse.json({ error: "Failed to load roles" }, { status: 500 });
  }
}
